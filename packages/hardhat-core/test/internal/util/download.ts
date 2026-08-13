import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";

import { download } from "../../../src/internal/util/download";
import { useTmpDir } from "../../helpers/fs";

// Error codes that mean the host has no usable network access, as opposed to
// the download itself being broken.
const NETWORK_UNAVAILABLE_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
]);

/**
 * Returns true if the given error, or any of its causes, was produced by the
 * network being unreachable. undici wraps the underlying system error in a
 * `cause`, so the whole chain has to be checked.
 */
function isNetworkUnavailableError(error: unknown): boolean {
  let current: unknown = error;

  while (current instanceof Error) {
    const { code } = current as NodeJS.ErrnoException;

    if (code !== undefined && NETWORK_UNAVAILABLE_CODES.has(code)) {
      return true;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

describe("Compiler List download", function () {
  useTmpDir("compiler-downloader");

  describe("Compilers list download", function () {
    it("Should call download with the right params", async function () {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompiler");
      const expectedUrl = `https://solc-bin.ethereum.org/wasm/list.json`;

      // download the file
      try {
        await download(expectedUrl, downloadPath);
      } catch (error) {
        // This test needs to reach solc-bin. Skip it when running without
        // network access instead of reporting a failure that says nothing
        // about the code under test.
        if (isNetworkUnavailableError(error)) {
          this.skip();
        }

        throw error;
      }

      // Assert that the file exists
      assert.isTrue(await fsExtra.pathExists(downloadPath));
    });
  });
});
