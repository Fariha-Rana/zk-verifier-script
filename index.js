import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const API_URL = "https://relayer-api.horizenlabs.io/api/v1";

// Initialize submissions history
const historyFile = "./submissions-history.json";
let submissions = [];

try {
  if (fs.existsSync(historyFile)) {
    submissions = JSON.parse(fs.readFileSync(historyFile));
  }
} catch (error) {
  console.error("Error reading history file:", error.message);
}

const proof = JSON.parse(fs.readFileSync("./data/proof.json"));
const publicInputs = JSON.parse(fs.readFileSync("./data/public.json"));
const key = JSON.parse(fs.readFileSync("./data/main.groth16.vkey.json"));

const params = {
  proofType: "groth16",
  vkRegistered: false,
  proofOptions: {
    library: "snarkjs",
    curve: "bn128",
  },
  proofData: {
    proof: proof,
    publicSignals: publicInputs,
    vk: key,
  },
};

async function submitProof() {
  try {
    const requestResponse = await axios.post(
      `${API_URL}/submit-proof/${process.env.API_KEY}`,
      params
    );
    console.log(requestResponse.data);

    if (requestResponse.data.optimisticVerify != "success") {
      console.error("Proof verification failed, check proof artifacts");
      return false;
    }

    while (true) {
      const jobStatusResponse = await axios.get(
        `${API_URL}/job-status/${process.env.API_KEY}/${requestResponse.data.jobId}`
      );
      if (jobStatusResponse.data.status === "Finalized") {
        console.log("Job finalized successfully");
        console.log("Transaction Hash: ", jobStatusResponse.data?.txHash);
        console.log("Job ID: ", jobStatusResponse.data?.jobId);

        // Add new submission to history
        submissions.push({
          timestamp: new Date().toISOString(),
          jobId: jobStatusResponse.data.jobId,
          txHash: jobStatusResponse.data.txHash,
        });

        // Save updated history to file
        try {
          fs.writeFileSync(historyFile, JSON.stringify(submissions, null, 2));
          console.log("Submission saved to history file");
        } catch (error) {
          console.error("Error saving to history file:", error.message);
        }

        return true;
      } else {
        console.log("Job status: ", jobStatusResponse.data.status);
        console.log("Waiting for job to finalize...");
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
      }
    }
  } catch (error) {
    console.error("Error during proof submission:", error.message);
    return false;
  }
}

async function main() {
  console.log("Starting continuous proof submission process...");
  console.log("Press Ctrl+C to stop the process\n");

  while (true) {
    console.log("\n--- Starting new proof submission ---");
    const success = await submitProof();

    if (success) {
      console.log("Proof submission completed successfully");
    } else {
      console.log("Proof submission failed, will retry after delay");
    }

    // Wait for 10 seconds before starting the next submission
    console.log("Waiting 10 seconds before next submission...\n");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
