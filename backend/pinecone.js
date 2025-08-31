// backend/pinecone.js
const { Pinecone } = require("@pinecone-database/pinecone");

let pinecone;
let index;

async function initPinecone() {
  if (index) {
    return index;
  }

  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      // Remove controllerHostUrl - it's automatically handled
    });
  }

  try {
    const indexName = process.env.PINECONE_INDEX_NAME;
    console.log(`Attempting to connect to index: ${indexName}`);
    
    // Simply get the index - Pinecone will auto-discover the host
    index = pinecone.Index(indexName);
    console.log(`Successfully connected to index: ${indexName}`);
    
    // Optional: Test the connection with a simple stats call
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
    
    return index;
    
  } catch (error) {
    console.error('Error connecting to Pinecone:', error.message);
    throw error;
  }
}

// Helper function to create an index if it doesn't exist
async function createIndexIfNotExists(indexName, dimension = 768) {
  try {
    if (!pinecone) {
      pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
    }

    // Check if index exists
    try {
      await pinecone.describeIndex(indexName);
      console.log(`Index ${indexName} already exists`);
      return;
    } catch (error) {
      if (!error.message.includes('404')) {
        throw error;
      }
    }

    // Create the index
    console.log(`Creating index: ${indexName}`);
    await pinecone.createIndex({
      name: indexName,
      dimension: dimension, // This should match your embedding dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    
    console.log(`Index ${indexName} created successfully`);
    
    // Wait a bit for the index to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Error creating index:', error);
    throw error;
  }
}

module.exports = { initPinecone, createIndexIfNotExists };