const mongoose = require("mongoose");

const QnASchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  embedding: { type: [Number], default: [] } // vector storage
});

module.exports = mongoose.model("QnA", QnASchema, "qnas");
