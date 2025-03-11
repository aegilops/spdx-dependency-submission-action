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

  let submit_ref = core.getInput('submitRef');
  let sha = ''
  let scanned_ref = core.getInput('scannedRef');

  // if ref is set, override context with ref and SHA of HEAD of that ref
  if (submit_ref != '') {

    // make sure ref is in the form refs/heads/<branch>
    if (!submit_ref.startsWith('refs/')) {
      submit_ref = `refs/heads/${submit_ref}`;
    }

    // Get the SHA of the ref, using git
    // Just fetch one commit deep, to avoid pulling in the whole history
    const gitFetch = execFileSync('git', ['fetch', '--depth=1', 'origin', submit_ref], {
        stdio: 'pipe',
        encoding: 'utf8',
      });

    core.debug(`git fetch output: ${gitFetch}`);

    sha = execFileSync('git', ['show', '-s', '--format="%H"', 'FETCH_HEAD'], {
        stdio: 'pipe',
        encoding: 'utf8',
      }).trim().replace(/"/g, '');

    context.ref = submit_ref;
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
  if (submit_ref != '') {
    snapshot.ref = submit_ref;
    snapshot.sha = sha;
    core.notice(`Submitting snapshot from ref ${github.context.ref} to HEAD of ref ${snapshot.ref}`);
  }

  manifests?.forEach(manifest => {
    core.debug(JSON.stringify(manifest));

    // if we're submitting to another ref, override the manifest to add a prefix of the source ref
    // remove the refs/heads/ or refs/tags/ prefix from the ref, if it is present
    if (submit_ref != '') {
      const submit_ref = (scanned_ref != '' ? scanned_ref : github.context.ref).replace('refs/heads/', '').replace('refs/tags/', '');
      manifest.file.source_location = submit_ref + ':' + manifest.file.source_location;
    }

    snapshot.addManifest(manifest);
  });
  
  toolkit.submitSnapshot(snapshot, context);
}

run();
