// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";

/**
 * @title VickreyAuction
 * @dev A contract for Vickrey auctions (second-price sealed-bid) using Oasis Sapphire's TEE
 */
contract VickreyAuction is Ownable {
    // Events
    event AuctionCreated(
        bytes32 indexed auctionId,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 startTime,
        uint256 endTime,
        uint256 minimumBid
    );
    
    event BidCommitmentSubmitted(
        bytes32 indexed auctionId,
        address indexed bidder,
        bytes32 commitmentHash
    );
    
    event AuctionFinalized(
        bytes32 indexed auctionId,
        address indexed winner,
        uint256 winningPrice,
        uint256 highestBid
    );
    
    // Struct to store auction details
    struct Auction {
        address nftContract;
        uint256 tokenId;
        address creator;
        uint256 startTime;
        uint256 endTime;
        uint256 minimumBid;
        bool finalized;
        address winner;
        uint256 winningPrice;
    }
    
    // Mapping from auction ID to Auction
    mapping(bytes32 => Auction) public auctions;
    
    // Mapping from auction ID to bidder address to commitment hash
    mapping(bytes32 => mapping(address => bytes32)) public bidCommitments;
    
    // Mapping from auction ID to escrow amounts
    mapping(bytes32 => mapping(address => uint256)) public bidEscrows;
    
    // ROFL endpoint URL for the TEE service
    string public roflEndpoint;
    
    // Constructor
    constructor(string memory _roflEndpoint) Ownable(msg.sender) {
        roflEndpoint = _roflEndpoint;
    }
    
    /**
     * @dev Update the ROFL endpoint
     * @param _roflEndpoint New endpoint URL
     */
    function setRoflEndpoint(string memory _roflEndpoint) external onlyOwner {
        roflEndpoint = _roflEndpoint;
    }
    
    /**
     * @dev Create a new auction
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID of the NFT
     * @param startTime Start time of the auction
     * @param endTime End time of the auction
     * @param minimumBid Minimum bid amount
     * @return auctionId The ID of the created auction
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startTime,
        uint256 endTime,
        uint256 minimumBid
    ) external returns (bytes32) {
        require(startTime >= block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(minimumBid > 0, "Minimum bid must be greater than zero");
        
        // Transfer the NFT to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        // Generate auction ID
        bytes32 auctionId = keccak256(abi.encodePacked(
            nftContract,
            tokenId,
            startTime,
            endTime,
            block.timestamp,
            msg.sender
        ));
        
        // Store auction details
        auctions[auctionId] = Auction({
            nftContract: nftContract,
            tokenId: tokenId,
            creator: msg.sender,
            startTime: startTime,
            endTime: endTime,
            minimumBid: minimumBid,
            finalized: false,
            winner: address(0),
            winningPrice: 0
        });
        
        emit AuctionCreated(
            auctionId,
            nftContract,
            tokenId,
            startTime,
            endTime,
            minimumBid
        );
        
        return auctionId;
    }
    
    /**
     * @dev Submit a bid commitment (a hash that represents your bid)
     * @param auctionId The ID of the auction
     * @param commitmentHash Hash of the bid details (processed in TEE)
     */
    function submitBidCommitment(bytes32 auctionId, bytes32 commitmentHash) external payable {
        Auction storage auction = auctions[auctionId];
        
        require(auction.creator != address(0), "Auction does not exist");
        require(block.timestamp >= auction.startTime, "Auction has not started yet");
        require(block.timestamp <= auction.endTime, "Auction has ended");
        require(msg.value >= auction.minimumBid, "Bid is below minimum bid");
        
        // Store the bid commitment and escrow
        bidCommitments[auctionId][msg.sender] = commitmentHash;
        bidEscrows[auctionId][msg.sender] = msg.value;
        
        emit BidCommitmentSubmitted(auctionId, msg.sender, commitmentHash);
    }
    
    /**
     * @dev Finalize the auction (can only be called by ROFL TEE)
     * @param auctionId The ID of the auction
     * @param winner The address of the winner
     * @param winningPrice The second-highest bid (winning price)
     * @param highestBid The highest bid amount (for transparency)
     * @param roflSignature Signature from the ROFL TEE to verify authenticity
     */
    function finalizeAuction(
        bytes32 auctionId,
        address winner,
        uint256 winningPrice,
        uint256 highestBid,
        bytes memory roflSignature
    ) external {
        Auction storage auction = auctions[auctionId];
        
        require(auction.creator != address(0), "Auction does not exist");
        require(!auction.finalized, "Auction already finalized");
        require(block.timestamp > auction.endTime, "Auction not ended yet");
        
        // Verify that the caller is authorized
        // This would use Sapphire's roflEnsureAuthorizedOrigin in production
        // For POC we're simplifying
        require(verifyRoflSignature(auctionId, winner, winningPrice, highestBid, roflSignature), 
                "Invalid ROFL signature");
        
        // Update auction status
        auction.finalized = true;
        auction.winner = winner;
        auction.winningPrice = winningPrice;
        
        // Transfer NFT to winner
        IERC721(auction.nftContract).transferFrom(address(this), winner, auction.tokenId);
        
        // Transfer funds to the auction creator
        (bool success, ) = auction.creator.call{value: winningPrice}("");
        require(success, "Transfer to creator failed");
        
        // Refund excess bid amount to the winner (they only pay the second highest price)
        uint256 refundAmount = bidEscrows[auctionId][winner] - winningPrice;
        if (refundAmount > 0) {
            (bool refundSuccess, ) = winner.call{value: refundAmount}("");
            require(refundSuccess, "Refund to winner failed");
        }
        
        // Refund all other bidders
        // In a production contract, this would need to be implemented differently
        // to avoid gas limit issues with many bidders
        
        emit AuctionFinalized(auctionId, winner, winningPrice, highestBid);
    }
    
    /**
     * @dev Claims refund for non-winning bidders
     * @param auctionId The ID of the auction
     */
    function claimRefund(bytes32 auctionId) external {
        Auction storage auction = auctions[auctionId];
        
        require(auction.finalized, "Auction not finalized yet");
        require(msg.sender != auction.winner, "Winner cannot claim refund");
        require(bidEscrows[auctionId][msg.sender] > 0, "No funds to refund");
        
        uint256 refundAmount = bidEscrows[auctionId][msg.sender];
        bidEscrows[auctionId][msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");
    }
    
    /**
     * @dev Get auction details
     * @param auctionId The ID of the auction
     * @return Auction details
     */
    function getAuction(bytes32 auctionId) external view returns (
        address nftContract,
        uint256 tokenId,
        address creator,
        uint256 startTime,
        uint256 endTime,
        uint256 minimumBid,
        bool finalized,
        address winner,
        uint256 winningPrice
    ) {
        Auction storage auction = auctions[auctionId];
        return (
            auction.nftContract,
            auction.tokenId,
            auction.creator,
            auction.startTime,
            auction.endTime,
            auction.minimumBid,
            auction.finalized,
            auction.winner,
            auction.winningPrice
        );
    }
    
    /**
     * @dev Verify that the signature comes from the authorized ROFL TEE
     * In a production environment, this would use Sapphire's roflEnsureAuthorizedOrigin
     */
    function verifyRoflSignature(
        bytes32 auctionId,
        address winner,
        uint256 winningPrice,
        uint256 highestBid,
        bytes memory roflSignature
    ) internal view returns (bool) {
        // In a real implementation, we would use Sapphire's authentication method
        // to verify the signature from the TEE
        
        // For this POC we're just simulating the verification
        return roflSignature.length > 0;
    }
}
