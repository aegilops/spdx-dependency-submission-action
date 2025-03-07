const core = require('@actions/core');
const github = require('@actions/github');
const { execFileSync } = require('node:child_process');

const toolkit = require('@github/dependency-submission-toolkit');
const lib = require('./lib');

const VERSION = "0.2.0-extra-inputs";

async function run() {
  let manifests = lib.getManifestsFromSpdxFiles(lib.searchFiles());

  const correlator = core.getInput('correlator');

  // shallow clone of the github context, then override defaults with inputs, if present
  // only including what we need of the context, for using with the submission toolkit, vs a full deep clone
  let context = Object.assign({}, github.context);
  context.repo = Object.assign({}, github.context.repo);

  let ref = core.getInput('ref');
  let sha = '';

  // if ref is set, override context with ref and SHA of HEAD of that ref
  if (ref != '') {

    // make sure ref is in the form refs/heads/<branch>
    if (!ref.startsWith('refs/')) {
      ref = `refs/heads/${ref}`;
    }

    // get the SHA of the ref, using git
    const gitFetch = execFileSync('git', ['fetch', '--depth=1', 'origin', ref], {
        stdio: 'pipe',
        encoding: 'utf8',
      });

    core.debug(`git fetch output: ${gitFetch}`);

    sha = execFileSync('git', ['show', '-s', '--format="%H"', ref], {
        stdio: 'pipe',
        encoding: 'utf8',
      }).trim();

    context.ref = ref;
    context.sha = sha;
  }

  let snapshot = new toolkit.Snapshot({
    name: "spdx-to-dependency-graph-action",
    version: VERSION,
    url: "https://github.com/aegilops/spdx-dependency-submission-action",
  },
    context,
    {
      correlator: correlator,
      id: github.context.runId.toString()
    });

  // override generated Snapshot with input ref and corresponding SHA, if set
  if (ref != '') {
    snapshot.ref = ref;
    snapshot.sha = sha;
    core.notice(`Submitting snapshot for ref ${snapshot.ref} and HEAD SHA ${snapshot.sha}`);
  }

  manifests?.forEach(manifest => {
    snapshot.addManifest(manifest);
  });
  
  toolkit.submitSnapshot(snapshot, context);
}

run();
