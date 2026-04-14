import { execFile } from "node:child_process";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function runProcess(
  file: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string } = {}
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { cwd: options.cwd, env: options.env }, (error, stdout, stderr) => {
      if (error && typeof (error as NodeJS.ErrnoException).code === "string") {
        reject(error);
        return;
      }
      resolve({
        stdout,
        stderr,
        exitCode: error ? (error as { code?: number }).code ?? 1 : 0
      });
    });
    if (options.input !== undefined) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}
