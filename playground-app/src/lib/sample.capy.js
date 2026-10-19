/** Default Capylang sample for the playground editor. */
export const SAMPLE_CAPY = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;
