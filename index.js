require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

// Replace these with your own wallet private key and RPC URL
const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = "https://bsc-dataseed1.binance.org/";

// Token and PancakeSwap Router Addresses
const tokenAddress = process.env.TOKEN_ADDRESS;
const wbnbAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB address
const pancakeRouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap Router

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const routerAbi = [
  // Only include the necessary parts of the ABI
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function WETH() external pure returns (address)",
];
const tokenAbi = [
  // Only include the necessary parts of the ABI
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address) view returns (uint)",
];

const router = new ethers.Contract(pancakeRouterAddress, routerAbi, wallet);
const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);

// Amount to buy in BNB (e.g., 0.01 BNB)
const buyAmount = ethers.parseUnits("0.0001", "ether");

async function getTokenPrice() {
  const amounts = await router.getAmountsOut(buyAmount, [
    wbnbAddress,
    tokenAddress,
  ]);
  return amounts[1];
}

async function buyToken() {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
  const amountOutMin = 0; // Accept any amount of tokens
  const path = [wbnbAddress, tokenAddress];

  const tx = await router.swapExactETHForTokens(
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { value: buyAmount }
  );

  await tx.wait();
  console.log("Token bought:", tx.hash);
}

async function sellToken(tokenAmount) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
  const amountOutMin = 0; // Accept any amount of ETH
  const path = [tokenAddress, wbnbAddress];

  const tx = await router.swapExactTokensForETH(
    tokenAmount,
    amountOutMin,
    path,
    wallet.address,
    deadline
  );

  await tx.wait();
  console.log("Token sold:", tx.hash);
}

async function approveToken(amount) {
  const tx = await token.approve(pancakeRouterAddress, amount);
  await tx.wait();
  console.log("Token approved:", tx.hash);
}

async function executeTrade() {
  try {
    // Buy token
    await buyToken();

    // Get the balance of the token
    const tokenBalance = await token.balanceOf(wallet.address);

    // Approve the router to spend the token
    await approveToken(tokenBalance);

    // Sell token
    await sellToken(tokenBalance);
  } catch (error) {
    console.error("Error executing trade:", error);
  }
}

function startBot() {
  setInterval(executeTrade, 3000); // Execute trade every second
}

startBot();
