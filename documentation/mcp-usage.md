# Using Cognatio with an AI assistant (MCP)

Cognatio can be used by AI assistants that speak the [Model Context Protocol](https://modelcontextprotocol.io) (MCP),
for example **Claude Code**. The assistant can then look persons up, answer questions about your family trees and – if
you allow it – enter data for you. This guide shows how to connect an assistant and what it can do. Background and
decisions: [MCP concept](mcp-concept.md); technical details: [architecture](architecture.md#mcp--post-mcp).

> What the assistant reads (names, dates, places, notes …) goes to the provider of the AI model you use – for Claude,
> Anthropic. Switch MCP on only if you agree with that, and exclude family trees the assistant should not see.

## 1. Switch it on

1. Start Cognatio (the desktop app or the backend).
2. Open **Settings → "AI assistants (MCP)"** and tick **"Allow AI assistants"**.
3. The section now shows:
   - the **address**, e.g. `http://127.0.0.1:5123/mcp` (the port of your installation),
   - the **token** – shown **only now**; Cognatio keeps only a fingerprint of it,
   - a ready **command for Claude Code** and a **configuration block** for other programs, each with a copy button.

Every area starts with **read** only. Copy the command now; if the token is lost later, "New token" creates another one
(the old one stops working).

## 2. Connect Claude Code

Run the copied command once in a terminal:

```bash
claude mcp add --transport http cognatio http://127.0.0.1:5123/mcp --header "Authorization: Bearer <token>"
```

- Without further options the server is known in the folder where you ran the command. Add `--scope user` to use it
  in every folder: `claude mcp add --transport http --scope user cognatio …`.
- `claude mcp list` shows the server; in a Claude Code session, `/mcp` shows whether it is connected and lists its tools.
- To remove it: `claude mcp remove cognatio`.

**Other programs** that read their servers from a JSON file with `mcpServers` (for example `.mcp.json` of Claude Code
in a project folder) take the configuration block of the settings:

```json
{
  "mcpServers": {
    "cognatio": { "type": "http", "url": "http://127.0.0.1:5123/mcp", "headers": { "Authorization": "Bearer <token>" } }
  }
}
```

The client must reach the address on this computer (`127.0.0.1`); Cognatio does not accept connections from other
computers.

## 3. Ask

Just ask in your own words; the assistant picks the tools. Examples:

- "Which family trees are there, and how many persons does each have?"
- "Who are the ancestors of Anna Kraft up to the great-grandparents? Which of them came from Pomerania?"
- "Which persons were born between 1850 and 1900 in Leipzig?"
- "Are there possible duplicates of Karl Weber?"
- "Summarise the life of Greta Kraft with her life events and notes."
- "Which persons have no date of birth?" – "Give me the statistics of the family tree Weber."

With the permission **write** for persons (and sources):

- "Add a baptism for Anna Kraft on 2 October 1951 in St. Nicholas, Leipzig."
- "Enter this church book entry: … – with the source 'Taufbuch St. Nikolai 1951', page 12, as a citation for the birth."
- "Create Paul Kraft, born 1978, as a son of Anna Kraft." (The assistant looks for duplicates first.)

With the permissions for files:

- "Add the scan C:\Users\…\Documents\taufschein.jpg to Anna Kraft's baptism."
- "Export the family tree Kraft as GEDCOM 7 into my Documents folder."
- "Import C:\Users\…\Downloads\stammbaum.ged as a new family tree – show me the preview first."

Dates can be given as you would type them in the app ("14.09.1951", "1951", "about 1951"), written out ("2. Oktober 1951",
"October 2, 1951") or as ISO dates.
Without a named family tree the assistant works in the one the app shows.

## 4. Permissions

Set per area in the settings; a change applies at once. **Read** looks up, **write** creates, changes and moves into
the recycle bin (can be undone in the app), **delete** removes for good or replaces data (cannot be undone). Raising an
area to write or delete asks first. The settings for AI assistants can never be changed by an assistant.

| Area                              | read                                                                                                                                | write                                                                                                                                                                           | delete                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Persons, events, notes, relations | `search`, `list_persons`, `get_person`, `get_family`, `get_ancestors`, `get_descendants`, `find_duplicates`, `list_possible_errors` | `create_person`, `update_person`, `add_event`, `update_event`, `add_note`, `update_note`, `create_relation`, `update_relation`, `move_to_recycle_bin`                           | `delete_event`, `delete_note`                                       |
| Sources and citations             | `list_sources`, `get_source`, `list_repositories`                                                                                   | `create_source`, `update_source`, `create_repository`, `update_repository`, `add_citation`, `update_citation`, `link_citation`, `unlink_citation`, `move_source_to_recycle_bin` | `delete_citation`                                                   |
| Media                             | `list_media`                                                                                                                        | `add_media`, `set_profile_picture`                                                                                                                                              | `remove_media`                                                      |
| Family trees                      | `list_family_trees`                                                                                                                 | `create_family_tree`, `rename_family_tree`, `delete_family_tree` (into the recycle bin)                                                                                         | `delete_for_good` of a family tree (also needs recycle bin: delete) |
| Recycle bin                       | `list_recycle_bin`                                                                                                                  | `restore_from_recycle_bin`                                                                                                                                                      | `delete_for_good`                                                   |
| Import and export                 | `list_imports`, `export_family_tree`, `get_job`                                                                                     | `import_file` (new family tree or merge)                                                                                                                                        | `import_file` with "overwrite"                                      |
| Backup                            | `list_backups`, `get_job`                                                                                                           | `create_backup`                                                                                                                                                                 | `restore_backup` (replaces all data)                                |
| Settings                          | `get_settings`                                                                                                                      | `set_settings` (size limits, log level)                                                                                                                                         | –                                                                   |
| Statistics and log                | `get_statistics`, `read_log`                                                                                                        | –                                                                                                                                                                               | –                                                                   |

Every area offers all three levels, so "all areas" can be ticked in each column; where a level has no tool of its own
(e.g. "delete" for settings or statistics) it grants nothing more.

**Statistics:** `get_statistics` names persons (the holders of records, the oldest birth, the start of the ancestors)
only when persons may be read, and the most cited sources only when sources may be read; otherwise it gives the
figures alone.

**Family trees:** an assistant sees only the family trees ticked in the settings; new family trees are visible. Names
of family trees stay unique: creating or renaming one with the name of another is refused (`TREE_NAME_TAKEN`); if
family trees with the same name exist from before, the assistant has to name one by its id (`TREE_AMBIGUOUS`).

**Dates** are checked like in the form of the app: `14.09.1951`, `09.1951`, `1951`, `um 1951`, `nach 1951`, `1949-1951`
or ISO `1951-09-14`; a date written out in a language of the app (`2. Oktober 1951`, `May 1951`) is stored as
`02.10.1951` or `05.1951`. The precision follows from the form. A day that does not exist, a date in the future, a range that
ends before it starts, free text and a death before the birth are refused (`INVALID_DATE`, `DEATH_BEFORE_BIRTH`).
Relations take a complete day as start and end; they come back as `12.06.1948` like every other date. A relation that
looks wrong – a man as mother, a partner who is also a child or sibling, a mother of 60 – is refused as `IMPLAUSIBLE`
with the reasons, like the app asks before saving it; the assistant saves it only with `confirmed` after asking you.
`list_possible_errors` lists what the page "Possible errors" shows.

**Files** never travel through MCP: the assistant names a path on this computer. Only files and folders in your home
folder, the data folder and the backup folder of Cognatio are accepted. Long tasks (export, import, backup, restore) run
as jobs like in the app; the assistant follows them with `get_job`.

## 5. See what the assistant did

- **Activity** in the sidebar lists every change of an assistant ("claude-code: added a life event" – with the person),
  also refused ones; the open page shows the change at once.
- **Settings → System → Logs → "Only AI assistants (MCP)"** shows every call (tool, family tree, ids – no content).
- Changes can be undone in the app as usual; deleted persons, relations, sources and family trees are in the recycle bin.

## 6. Troubleshooting

| What you see                               | Cause and remedy                                                                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `404` / "MCP is switched off"              | Tick "Allow AI assistants" in the settings.                                                                                                                    |
| `401` / "MCP token missing or wrong"       | The token was replaced or MCP was switched off and on again: create a new token and add the server again (`claude mcp remove cognatio`, then the new command). |
| No connection at all                       | Cognatio is not running, or the address changed: the settings say so when the desktop app had to take another port – add the server with the new address.      |
| A tool is missing or answers `NOT_ALLOWED` | The permission of its area is too low; raise it in the settings (Claude Code lists the tools anew with `/mcp`).                                                |
| `TREE_NOT_FOUND`                           | The family tree is excluded in the settings, in the recycle bin or named differently; `list_family_trees` shows the visible ones.                              |
| `INVALID_DATE` / `DEATH_BEFORE_BIRTH`      | The date is not one the app accepts (see section 4); the answer names the field and why.                                                                       |
| `IMPLAUSIBLE`                              | The relation looks wrong (e.g. a man as mother); the answer says why. The assistant should ask you and save it only after your yes (`confirmed`).              |
| `PATH_NOT_ALLOWED` / `FILE_NOT_FOUND`      | Use an absolute path in your home, data or backup folder.                                                                                                      |
| `429` / "Too many requests"                | More than 20 requests per second; the assistant should wait a moment.                                                                                          |
| `403`                                      | The request came from a web page or under a foreign host name – only programs on this computer may connect.                                                    |

## 7. Switch it off

Untick "Allow AI assistants". The token becomes invalid at once; switching on again creates a new token and starts
with read only.
