#!/usr/bin/env python3
import os
import json
import hashlib
import time
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from web3 import Web3

# Initialize FastAPI app
app = FastAPI(title="Vickrey Auction Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Bid(BaseModel):
    auction_id: str
    bidder_address: str
    bid_amount: int
    signature: str
    timestamp: int = int(time.time())

class AuctionConfig(BaseModel):
    auction_id: str
    nft_contract_address: str
    nft_token_id: int
    start_time: int
    end_time: int
    minimum_bid: int
    creator_address: str
    creator_signature: str

class AuctionResult(BaseModel):
    auction_id: str
    winner_address: str
    winning_price: int  # Second highest price
    highest_bid: int    # For transparency, also reveal the highest bid
    total_bidders: int

# In-memory data storage
# In a production environment, this would be replaced with a secure database
auctions: Dict[str, AuctionConfig] = {}
bids: Dict[str, List[Bid]] = {}
auction_results: Dict[str, AuctionResult] = {}

# Utility function to verify a signature
def verify_signature(message: str, signature: str, address: str) -> bool:
    # In a real implementation, this would use web3.py to verify the signature
    # For the POC, we'll just simulate it
    return True

@app.get("/")
async def root():
    return {"message": "Vickrey Auction TEE Service Running"}

@app.post("/create-auction")
async def create_auction(auction_config: AuctionConfig):
    # Verify the creator's signature
    if not verify_signature(
        json.dumps({
            "auction_id": auction_config.auction_id,
            "nft_contract_address": auction_config.nft_contract_address,
            "nft_token_id": auction_config.nft_token_id,
            "start_time": auction_config.start_time,
            "end_time": auction_config.end_time,
            "minimum_bid": auction_config.minimum_bid
        }),
        auction_config.creator_signature,
        auction_config.creator_address
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Store the auction
    auctions[auction_config.auction_id] = auction_config
    bids[auction_config.auction_id] = []
    
    return {"status": "success", "auction_id": auction_config.auction_id}

@app.post("/submit-bid")
async def submit_bid(bid: Bid):
    # Check if the auction exists
    if bid.auction_id not in auctions:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction = auctions[bid.auction_id]
    
    # Check if the auction is active
    current_time = int(time.time())
    if current_time < auction.start_time:
        raise HTTPException(status_code=400, detail="Auction has not started yet")
    if current_time > auction.end_time:
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    # Verify the bidder's signature
    if not verify_signature(
        json.dumps({
            "auction_id": bid.auction_id,
            "bidder_address": bid.bidder_address,
            "bid_amount": bid.bid_amount,
            "timestamp": bid.timestamp
        }),
        bid.signature,
        bid.bidder_address
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Check if the bid is higher than the minimum bid
    if bid.bid_amount < auction.minimum_bid:
        raise HTTPException(status_code=400, detail="Bid is below the minimum bid")
    
    # Store the bid
    bids[bid.auction_id].append(bid)
    
    # Generate a commitment hash that we return to the bidder as receipt
    # This helps prove later that their bid was included
    commitment_hash = hashlib.sha256(
        f"{bid.auction_id}:{bid.bidder_address}:{bid.bid_amount}:{bid.timestamp}".encode()
    ).hexdigest()
    
    return {
        "status": "success", 
        "bid_id": commitment_hash,
        "message": "Your bid has been securely recorded"
    }

@app.get("/auction-status/{auction_id}")
async def get_auction_status(auction_id: str):
    # Check if the auction exists
    if auction_id not in auctions:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction = auctions[auction_id]
    current_time = int(time.time())
    
    status = "upcoming"
    if current_time >= auction.start_time and current_time <= auction.end_time:
        status = "active"
    elif current_time > auction.end_time:
        status = "ended"
    
    # Return only public information about the auction
    return {
        "auction_id": auction_id,
        "nft_contract_address": auction.nft_contract_address,
        "nft_token_id": auction.nft_token_id,
        "start_time": auction.start_time,
        "end_time": auction.end_time,
        "minimum_bid": auction.minimum_bid,
        "status": status,
        "num_bids": len(bids[auction_id]),
        # We don't reveal any information about the actual bids until the auction ends
    }

@app.post("/finalize-auction/{auction_id}")
async def finalize_auction(auction_id: str, request: Request):
    # Check if the auction exists
    if auction_id not in auctions:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction = auctions[auction_id]
    current_time = int(time.time())
    
    # Check if the auction has ended
    if current_time <= auction.end_time:
        raise HTTPException(status_code=400, detail="Auction has not ended yet")
    
    # Check if the auction has already been finalized
    if auction_id in auction_results:
        return auction_results[auction_id]
    
    # Get all bids for this auction
    auction_bids = bids[auction_id]
    
    # If there are no bids, the auction fails
    if not auction_bids:
        raise HTTPException(status_code=400, detail="No bids were placed in this auction")
    
    # Sort bids by amount in descending order
    sorted_bids = sorted(auction_bids, key=lambda x: x.bid_amount, reverse=True)
    
    # Determine the winner and the winning price
    winner = sorted_bids[0].bidder_address
    highest_bid = sorted_bids[0].bid_amount
    
    # The winning price is the second highest bid
    # If there's only one bid, the winning price is the minimum bid
    winning_price = auction.minimum_bid
    if len(sorted_bids) > 1:
        winning_price = sorted_bids[1].bid_amount
    
    # Create and store the auction result
    result = AuctionResult(
        auction_id=auction_id,
        winner_address=winner,
        winning_price=winning_price,
        highest_bid=highest_bid,
        total_bidders=len(auction_bids)
    )
    auction_results[auction_id] = result
    
    return result

@app.get("/verify-bid")
async def verify_bid(auction_id: str, bidder_address: str, bid_hash: str):
    """
    Allow a bidder to verify that their bid was included
    """
    if auction_id not in bids:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    # Check if the auction has been finalized
    if auction_id not in auction_results:
        raise HTTPException(status_code=400, detail="Auction has not been finalized yet")
    
    # Find the bidder's bid
    bidder_bids = [bid for bid in bids[auction_id] if bid.bidder_address == bidder_address]
    
    if not bidder_bids:
        raise HTTPException(status_code=404, detail="No bids found for this bidder")
    
    # For each bid, check if the hash matches
    verified_bids = []
    for bid in bidder_bids:
        computed_hash = hashlib.sha256(
            f"{bid.auction_id}:{bid.bidder_address}:{bid.bid_amount}:{bid.timestamp}".encode()
        ).hexdigest()
        
        if computed_hash == bid_hash:
            verified_bids.append({
                "bid_amount": bid.bid_amount,
                "timestamp": bid.timestamp,
                "was_included": True
            })
    
    if not verified_bids:
        raise HTTPException(status_code=404, detail="Bid hash not found")
    
    return {"verified_bids": verified_bids}

if __name__ == "__main__":
    # In production, you would use a proper WSGI server
    uvicorn.run(app, host="0.0.0.0", port=8000)
