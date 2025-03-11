# SPDX to Dependency Graph Action

This repository makes it easy to upload an SPDX 2.2 formatted SBOM to GitHub's dependency submission API.
This lets you quickly receive Dependabot alerts for package manifests which GitHub doesn't directly support like pnpm or Paket by using existing off-the-shelf SBOM generators.

## Example workflow

This workflow uses the [Microsoft sbom-tool](https://github.com/microsoft/sbom-tool).

```yaml
name: SBOM upload

on: 
  workflow_dispatch:
  push: 
    branches: ["main"]

jobs:
  SBOM-upload:

    runs-on: ubuntu-latest
    permissions: 
      id-token: write
      contents: write
      
    steps:
    - uses: actions/checkout@v3
    - name: Generate SBOM
      run: | 
        curl -Lo $RUNNER_TEMP/sbom-tool https://github.com/microsoft/sbom-tool/releases/latest/download/sbom-tool-linux-x64
        chmod +x $RUNNER_TEMP/sbom-tool
        $RUNNER_TEMP/sbom-tool generate -b . -bc . -pn ${{ github.repository }} -pv 1.0.0 -ps OwnerName -nsb https://sbom.mycompany.com -V Verbose
    - uses: actions/upload-artifact@v4
      with:
        name: sbom
        path: _manifest/spdx_2.2
    - name: SBOM upload 
      uses: advanced-security/spdx-dependency-submission-action@v0.1.2
      with:
        filePath: "_manifest/spdx_2.2/"
```

Add support for running inside a matrix by overriding the default correlater unique identifier to include the job+matrix values.  Consider these sample steps:

```yaml
      # Format corrleator as "job(matrixvalue1, matrixvalue2, ... )" or just "job" with a null matrix
      - name: Define correlator
        id: matrix_parser
        run: |
            correlator=$(echo '${{ toJSON(matrix) }}' | jq -r 'if . == null then "${{ github.job }}" else "${{ github.job }}(" + ([.[] | tostring] | join(", ")) + ")" end')
            echo "correlator=$correlator" >> $GITHUB_OUTPUT

      - name: SBOM upload
        uses: advanced-security/spdx-dependency-submission-action@v0.1.2
        with:
          filePath: "${{ matrix.sbom }}"
          correlator: ${{ steps.matrix_parser.outputs.correlator }}
```

You can submit a dependency graph to the default branch from a different branch or a non-HEAD tag. This allows you to see Dependabot alerts on places other than the HEAD of the default branch.

You can specify the `submitRef` input, which should be the name of the default branch, and the optional `scannedLabel` input is used to describe what was scanned. If `scannedLabel` is not provided, then the current ref is used instead.

This submits the dependency submission to the current HEAD SHA of the `submitRef` given.

The manifest location is modified to prepend the `scannedLabel` (or current ref) (plus a `:`) so that any Dependabot alerts generated from the branch are traceable. The `correlator` is set to include the `scannedLabel` and the `submitRef`, so that alerts are unique to that combination.

If a `submitref` is given as a bare branch name such as `main`, then `refs/heads/` is prepended.

If a `scannedLabel` contains either `refs/heads/` or `refs/tags/`, then that is stripped.

For example, if we run a step in a workflow on the `this-is-a-branch` branch:

```yaml
      - name: SBOM upload
        uses: advanced-security/spdx-dependency-submission-action@v0.1.2
        with:
          filePath: sbom.json
          submitRef: main
```

That will upload the submission to the HEAD commit of `refs/heads/main`, with the manifest given as `this-is-a-branch:sbom.json`.

If we want to scan the `v1` tag, we first checkout that tag, and then run the action. This time we explicitly set the `scannedLabel` to `v1`:

```yaml
     - name: Checkout v1
       uses: actions/checkout@v4
       with:
        ref: v1

      - name: SBOM upload
        uses: advanced-security/spdx-dependency-submission-action@v0.1.2
        with:
          filePath: sbom.json
          submitRef: main
          scannedLabel: v1
```

## Support

Please create [GitHub Issues][github-issues] if there are bugs or feature requests.

This project uses [Sematic Versioning (v2)](https://semver.org/) and with major releases, breaking changes will occur.

## License

This project is licensed under the terms of the MIT open source license.
Please refer to [MIT][license] for the full terms.

<!-- Resources -->

[license]: ./LICENSE
[github-issues]: https://github.com/advanced-security/spdx-dependency-submission-action/issues
