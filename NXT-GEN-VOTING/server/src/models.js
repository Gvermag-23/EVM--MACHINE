import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, unique: true, lowercase: true, index: true },
    nonce: { type: String, default: '' },
    displayName: { type: String, default: '' },
  },
  { timestamps: true },
);

const txRecordSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true, lowercase: true, index: true },
    type: {
      type: String,
      enum: ['createElection', 'addCandidate', 'startElection', 'endElection', 'vote'],
      required: true,
    },
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    electionId: { type: Number, default: null },
    candidateId: { type: Number, default: null },
    blockNumber: { type: Number, default: null },
  },
  { timestamps: true },
);

const electionMetaSchema = new mongoose.Schema(
  {
    electionId: { type: Number, required: true, unique: true, index: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

const candidateMetaSchema = new mongoose.Schema(
  {
    electionId: { type: Number, required: true, index: true },
    candidateId: { type: Number, required: true },
    bio: { type: String, default: '' },
  },
  { timestamps: true },
);

candidateMetaSchema.index({ electionId: 1, candidateId: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const TxRecord = mongoose.model('TxRecord', txRecordSchema);
export const ElectionMetadata = mongoose.model('ElectionMetadata', electionMetaSchema);
export const CandidateMetadata = mongoose.model('CandidateMetadata', candidateMetaSchema);