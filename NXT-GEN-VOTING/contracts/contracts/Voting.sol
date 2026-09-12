// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NXT-GEN-VOTING
/// @notice Decentralized voting with admin controls, multiple elections,
///         single-choice ballots and double-vote protection at the contract level.
contract Voting {
    error OnlyAdmin();
    error ElectionNotFound();
    error ElectionAlreadyStarted();
    error ElectionNotActive();
    error VotingClosed();
    error CandidateNotFound();
    error HasAlreadyVoted();
    error CandidatesLimitReached();

    address public owner;

    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string name;
        string description;
        uint256 duration;
        uint256 startTime;
        bool isActive;
        bool ended;
    }

    uint256 public constant MAX_CANDIDATES = 50;

    uint256 public electionCount;

    uint256[] private _electionIds;

    mapping(uint256 => Election) public elections;
    mapping(uint256 => Candidate[]) public candidates;
    mapping(uint256 => uint256) public totalVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ElectionCreated(uint256 indexed electionId, string name);
    event CandidateAdded(uint256 indexed electionId, uint256 candidateId, string name);
    event ElectionStarted(uint256 indexed electionId, uint256 startTime, uint256 duration);
    event ElectionEnded(uint256 indexed electionId);
    event VoteCast(uint256 indexed electionId, uint256 candidateId, address indexed voter);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyAdmin();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function createElection(
        string calldata name,
        string calldata description,
        uint256 durationSeconds
    ) external onlyOwner returns (uint256) {
        require(bytes(name).length > 0, "name required");
        require(durationSeconds > 0, "duration required");

        electionCount++;
        Election storage e = elections[electionCount];
        e.id = electionCount;
        e.name = name;
        e.description = description;
        e.duration = durationSeconds;
        _electionIds.push(electionCount);

        emit ElectionCreated(electionCount, name);
        return electionCount;
    }

    function addCandidate(
        uint256 electionId,
        string calldata name,
        string calldata description
    ) external onlyOwner {
        Election storage e = elections[electionId];
        if (e.id == 0) revert ElectionNotFound();
        if (e.isActive || e.ended) revert ElectionAlreadyStarted();
        if (candidates[electionId].length >= MAX_CANDIDATES) revert CandidatesLimitReached();
        require(bytes(name).length > 0, "name required");

        uint256 candidateId = candidates[electionId].length;
        candidates[electionId].push(
            Candidate({ id: candidateId, name: name, description: description, voteCount: 0 })
        );

        emit CandidateAdded(electionId, candidateId, name);
    }

    function startElection(uint256 electionId) external onlyOwner {
        Election storage e = elections[electionId];
        if (e.id == 0) revert ElectionNotFound();
        if (e.isActive || e.ended) revert ElectionAlreadyStarted();

        e.isActive = true;
        e.startTime = block.timestamp;

        emit ElectionStarted(electionId, e.startTime, e.duration);
    }

    function endElection(uint256 electionId) external onlyOwner {
        Election storage e = elections[electionId];
        if (e.id == 0) revert ElectionNotFound();
        if (!e.isActive || e.ended) revert ElectionNotActive();

        e.ended = true;
        emit ElectionEnded(electionId);
    }

    function vote(uint256 electionId, uint256 candidateId) external {
        Election storage e = elections[electionId];
        if (e.id == 0) revert ElectionNotFound();
        if (!e.isActive || e.ended) revert ElectionNotActive();
        if (block.timestamp >= e.startTime + e.duration) revert VotingClosed();
        if (hasVoted[electionId][msg.sender]) revert HasAlreadyVoted();
        if (candidateId >= candidates[electionId].length) revert CandidateNotFound();

        hasVoted[electionId][msg.sender] = true;
        candidates[electionId][candidateId].voteCount++;
        totalVotes[electionId]++;

        emit VoteCast(electionId, candidateId, msg.sender);
    }

    function getElectionIds() external view returns (uint256[] memory) {
        return _electionIds;
    }

    function getElection(uint256 electionId) external view returns (Election memory) {
        return elections[electionId];
    }

    function getElectionEnd(uint256 electionId) external view returns (uint256) {
        Election storage e = elections[electionId];
        if (e.id == 0) revert ElectionNotFound();
        return e.startTime + e.duration;
    }

    function getCandidateCount(uint256 electionId) external view returns (uint256) {
        return candidates[electionId].length;
    }

    function getCandidate(uint256 electionId, uint256 candidateId) external view returns (Candidate memory) {
        if (candidateId >= candidates[electionId].length) revert CandidateNotFound();
        return candidates[electionId][candidateId];
    }

    function getElectionResults(uint256 electionId) external view returns (Candidate[] memory) {
        if (elections[electionId].id == 0) revert ElectionNotFound();
        return candidates[electionId];
    }
}