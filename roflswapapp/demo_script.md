# ROFLSwap Order Matching System Demo Script

## Introduction

"Today I'm excited to demonstrate the ROFLSwap order matching system, which powers our decentralized exchange on Oasis Sapphire. This system handles the core functionality of matching buy and sell orders in a secure, efficient, and transparent manner."

## Starting the Demo

"Let me start the demo to show you how this works in real-time."

```
python run_orderbook.py --speed medium --pairs 8 --match-rate 40
```

"As you can see, the system is initializing with some random orders for our two tokens: WATER and FIRE. These represent the initial state of our order book."

## Explaining the Order Book

"The order book you see here is the heart of any exchange. It contains all active buy and sell orders, organized by price. Let me explain how to read it:"

- "Buy orders are shown in green and sell orders in red."
- "Orders are sorted by price, with the highest buy and lowest sell prices at the top."
- "Notice the 'spread' between the highest buy and lowest sell price - this is a key market indicator."
- "Each order includes the token, price, size, and a shortened version of the owner's address for privacy."

## Order Matching Process

"Now, let's watch the system match orders. This is where the magic happens."

"When a buy order's price is greater than or equal to a sell order's price for the same token, they can be matched. This is the fundamental principle of price-time priority matching."

"Notice how the system is highlighting matches as they occur. For each match, you can see:"

- "The buy order details"
- "The sell order details"
- "The match details including the execution price, quantity, and total value"

"This is exactly what happens behind the scenes in production, except that in our live system, these matches trigger actual token transfers between users' wallets."

## Price and Time Priority

"The matching algorithm follows strict price-time priority rules:"

- "Buy orders with higher prices get matched first"
- "Sell orders with lower prices get matched first"
- "When prices are equal, orders that were placed earlier get priority"

"This ensures fair and predictable trading for all participants."

## Explaining Partial Fills

"Sometimes you'll see orders that are only partially filled. This happens when the sizes of the matching orders aren't equal. The remaining portion stays active in the order book until it finds another match or is canceled."

## Continuous Matching

"In a real exchange environment, our system continuously monitors for new orders and executes matches as they become available. This live demonstration simulates that process with rounds of new orders and matching."

## Behind the Scenes

"While this visualization focuses on the matching logic, our production system includes several key additional components:"

- "Encrypted orders to ensure privacy and prevent front-running"
- "Authentication through SIWE (Sign-In With Ethereum) to verify users"
- "Integration with the ROFLSwapOracle smart contract on Oasis Sapphire"
- "Confidential state management through TEEs (Trusted Execution Environments)"

## Security and Trust

"Our order matching system is designed with security and privacy as top priorities:"

- "All sensitive order data is encrypted"
- "The matching engine runs in a secure enclave"
- "Users don't need to trust us - the system is designed so that even we can't see the details of user orders until they're matched"
- "Smart contracts validate all matches before execution"

## Conclusion

"This demonstration shows the core functionality of our order matching system, which ensures fair, efficient, and transparent trading on ROFLSwap."

"We've built this system to be highly performant and secure, capable of handling significant trading volume while maintaining the privacy guarantees that traders expect from a DEX built on Oasis Sapphire."

"Thank you for watching this demonstration. I'm happy to answer any questions about the matching algorithm or any other aspects of our exchange infrastructure." 