# Ad tool

The office's ad-making tool: one static page (`frontend/public/index.html`) with the agents' photos and the logo (`frontend/public/images/`). No sign-in, no server of its own.

- **Address:** its own Railway service, and also `/ad-tool` on the CRM's address (the CRM forwards it). Keep the second one: the CRM's **יצירת מודעה** button opens `/ad-tool#...` with the property already filled in (the details travel after the `#`, so they never reach a server), and the agent photos are stored in the database as `/ad-tool/images/...`.
- **Agents:** the page reads the office team list straight from the database through the public function `ad_tool_agents()` (publishable key, in the page). It returns only what every ad already prints: name, role, license, phone and photo. Adding, editing and removing agents is done only by the admin, on the **ניהול סוכנים** page in the CRM; a change there shows in the ad tool too.
- **Title on the ad:** each team-list row has a `gender` (chosen at sign-up, fixable by the admin), a `license` and a `photo_url`. סוכן / סוכנת נדל"ן follows from the gender; until an agent has one, the old stored `role` is used. Photos are cut-out portraits (transparent, 800×800).
- **Run locally:** `cd ad-tool/frontend && npm install && npm start` (http://localhost:3002/ad-tool). `serve.json` makes `/ad-tool` and `/ad-tool/images/...` work the same way here as behind the CRM.
- Design notes: [design-notes.md](design-notes.md).
