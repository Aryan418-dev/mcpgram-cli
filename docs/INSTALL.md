# MCPGRAM installation

## Public command (stable forever)

```bash
curl -fsSL https://mcpgram.vercel.app/install | bash
```

```bash
curl -fsSL https://install.mcpgram.com | bash
```

Windows:

```powershell
irm https://mcpgram.vercel.app/install.ps1 | iex
```

Users must never need GitHub URLs, usernames, or package names.

## Hosting

| URL | Serves |
|-----|--------|
| `GET /install` | Bash installer |
| `GET /install.ps1` | PowerShell installer |
| `GET /cli/manifest.json` | Binary release manifest |
| `GET /cli/package.tgz` | Optional package mirror |

Hosted on mcpgram-dashboard. Point `install.mcpgram.com` CNAME at the dashboard.

## Strategy order

1. Binary (from manifest) → `~/.mcpgram/bin`
2. Package channel (silent)
3. Origin tarball `/cli/package.tgz`

Public command never changes.

## Security

- HTTPS only
- No sudo
- User-home install
- Verify sha256 when binaries ship
