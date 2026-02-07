# Storage and external drives (Lunaverse)

When deploying or running Estate Planning Rust on the Lunaverse server, follow these rules for the 5TB external drive.

## 5TB drive partitions

The server has one 5TB external drive partitioned in half:

| Partition    | Device   | Mount point         | Used by              | Use for Estate Planning? |
|-------------|----------|---------------------|----------------------|---------------------------|
| **Lacie_Free**  | `/dev/sda3` | `/mnt/lacie_external` | **Monero node + mining** (blockchain, logs) | **No.** Do not write here. Do not unmount. |
| **Lacie_Locked** | `/dev/sda2` | (mount when needed, e.g. `/mnt/lacie_locked`) | Available for large data | **Yes.** Use for DB backups, bulk exports, future blockchain index data. |

Reference: [Monero_Node_Server/docs/LACIE_DRIVE_SAFE_REMOVAL.md](../../../Monero_Node_Server/docs/LACIE_DRIVE_SAFE_REMOVAL.md) (which partition is which).

## What to do

1. **Never use Lacie_Free** for Estate Planning Rust. It is used by the Monero node; writing or unmounting can corrupt the node or cause data loss.

2. **Use Lacie_Locked for estate-related large data:**
   - When Lacie_Locked is mounted (e.g. at `/mnt/lacie_locked`), configure DB backup scripts or any bulk export to write there.
   - Do not store Estate Planning data on the server’s small root disk when large datasets are involved; use Lacie_Locked instead.

3. **Runbooks:** If you add backup or migration scripts that use Lacie_Locked, document the mount path and steps in [Server_Management_Lunaverse](../../../Server_Management_Lunaverse) (e.g. in a runbook or EXTERNAL_DRIVE.md) so others know not to use Lacie_Free for this app.
