import { expect } from 'chai';
import hre from 'hardhat';

describe('Voting', function () {
  let voting, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await hre.ethers.getSigners();
    const factory = await hre.ethers.getContractFactory('Voting');
    voting = await factory.deploy();
    await voting.waitForDeployment();
  });

  it('sets the deployer as owner', async function () {
    expect(await voting.owner()).to.equal(owner.address);
  });

  it('only allows the owner to create elections', async function () {
    await expect(voting.connect(alice).createElection('Poll A', 'desc', 3600)).to.be.revertedWithCustomError(
      voting,
      'OnlyAdmin',
    );
  });

  it('creates an election and emits ElectionCreated', async function () {
    await expect(voting.createElection('Poll A', 'desc', 3600))
      .to.emit(voting, 'ElectionCreated')
      .withArgs(1, 'Poll A');

    const election = await voting.getElection(1);
    expect(election.name).to.equal('Poll A');
    expect(election.description).to.equal('desc');
    expect(election.duration).to.equal(3600);
    expect(election.isActive).to.equal(false);
    expect(election.ended).to.equal(false);
    expect(await voting.getElectionIds()).to.deep.equal([1n]);
  });

  it('rejects elections without a name or duration', async function () {
    await expect(voting.createElection('', 'x', 3600)).to.be.revertedWith('name required');
    await expect(voting.createElection('x', 'y', 0)).to.be.revertedWith('duration required');
  });

  it('adds candidates only to known, non-started elections', async function () {
    await voting.createElection('Poll A', 'desc', 3600);

    await expect(voting.addCandidate(1, 'Alice', 'candidate a'))
      .to.emit(voting, 'CandidateAdded')
      .withArgs(1, 0, 'Alice');

    expect(await voting.getCandidateCount(1)).to.equal(1);

    const candidate = await voting.getCandidate(1, 0);
    expect(candidate.name).to.equal('Alice');
    expect(candidate.voteCount).to.equal(0);

    await expect(voting.addCandidate(99, 'Nobody', 'no election')).to.be.revertedWithCustomError(
      voting,
      'ElectionNotFound',
    );

    await voting.startElection(1);
    await expect(voting.addCandidate(1, 'Late', 'too late')).to.be.revertedWithCustomError(
      voting,
      'ElectionAlreadyStarted',
    );
  });

  it('only lets the owner start and end elections', async function () {
    await voting.createElection('Poll A', 'desc', 3600);

    await expect(voting.connect(alice).startElection(1)).to.be.revertedWithCustomError(voting, 'OnlyAdmin');

    const startTx = await voting.startElection(1);
    await expect(startTx).to.emit(voting, 'ElectionStarted');
    const started = await voting.getElection(1);
    expect(started.isActive).to.equal(true);
    expect(started.startTime).to.be.gt(0);

    await expect(voting.connect(alice).endElection(1)).to.be.revertedWithCustomError(voting, 'OnlyAdmin');

    await expect(voting.endElection(1)).to.emit(voting, 'ElectionEnded').withArgs(1);
  });

  it('does not allow voting before an election starts', async function () {
    await voting.createElection('Poll A', 'desc', 3600);
    await voting.addCandidate(1, 'Alice', 'a');

    await expect(voting.connect(alice).vote(1, 0)).to.be.revertedWithCustomError(voting, 'ElectionNotActive');
  });

  it('prevents double voting at the contract level', async function () {
    await voting.createElection('Poll A', 'desc', 3600);
    await voting.addCandidate(1, 'Alice', 'a');
    await voting.addCandidate(1, 'Bob', 'b');
    await voting.startElection(1);

    await expect(voting.connect(alice).vote(1, 0)).to.emit(voting, 'VoteCast').withArgs(1, 0, alice.address);

    // Second vote from the same wallet must revert.
    await expect(voting.connect(alice).vote(1, 1)).to.be.revertedWithCustomError(voting, 'HasAlreadyVoted');

    expect(await voting.totalVotes(1)).to.equal(1);
    expect(await voting.hasVoted(1, alice.address)).to.equal(true);
    expect(await voting.hasVoted(1, bob.address)).to.equal(false);
  });

  it('rejects votes for unknown candidates', async function () {
    await voting.createElection('Poll A', 'desc', 3600);
    await voting.addCandidate(1, 'Alice', 'a');
    await voting.startElection(1);

    await expect(voting.connect(alice).vote(1, 7)).to.be.revertedWithCustomError(voting, 'CandidateNotFound');
  });

  it('stops voting once the election is ended', async function () {
    await voting.createElection('Poll A', 'desc', 3600);
    await voting.addCandidate(1, 'Alice', 'a');
    await voting.startElection(1);
    await voting.endElection(1);

    await expect(voting.connect(alice).vote(1, 0)).to.be.revertedWithCustomError(voting, 'ElectionNotActive');
  });

  it('counts votes and returns accurate results', async function () {
    await voting.createElection('Poll A', 'desc', 3600);
    await voting.addCandidate(1, 'Alice', 'a');
    await voting.addCandidate(1, 'Bob', 'b');
    await voting.startElection(1);

    await voting.connect(alice).vote(1, 0);
    await voting.connect(bob).vote(1, 0);

    const results = await voting.getElectionResults(1);
    expect(results[0].voteCount).to.equal(2);
    expect(results[1].voteCount).to.equal(0);
    expect(await voting.totalVotes(1)).to.equal(2);
  });
});