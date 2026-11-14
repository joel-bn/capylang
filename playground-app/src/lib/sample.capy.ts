/** Default Capylang sample: WASI CLI with visible stdout (no includes). */
export const SAMPLE_CAPY = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;
import wasi_snapshot_preview1::fd_write(fd: u32, io: *u32, count: u32, res: *u32) -> u32 as fd_write;

record iovec {
    buf: *u32,
    len: u32,
};

fn print_s(s: string)
{
    let mut res: *u32 = cabi_realloc(0, 0, 4, 4) as *u32;
    let v: *iovec = allocate iovec{
        buf = s.ptr as *u32,
        len = s.size as u32,
    };
    fd_write(1u32, v as *u32, 1u32, res);
}

@export
fn _start() {
    print_s("hello from capylang\\n");
    proc_exit(0u32);
}
`;
