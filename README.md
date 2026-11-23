# Ittefaq Electronics (GitHub + Netlify + Supabase, all free)

- `public/` - shop (`index.html`) and admin portal (`admin.html`)
- `netlify/functions/api.js` - backend API + chatbot
- `supabase.sql` - database table + 10 starter products

## Setup (about 15 minutes)

### 1. Database (Supabase)
1. Sign up at https://supabase.com and create a new project.
2. Open **SQL Editor**, paste all of `supabase.sql`, click **Run**.
3. Open **Project Settings -> API** and copy the **Project URL** and the **secret key** (`sb_secret_...`, or the legacy `service_role` key). Keep it secret. Do NOT use the publishable key for `SUPABASE_SERVICE_KEY`: it cannot write products.

### 2. GitHub
Create a new repository, then upload all these files (or use git):
```
git init && git add . && git commit -m "Ittefaq Electronics"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/ittefaq-electronics.git
git push -u origin main
```

### 3. Netlify
1. At https://netlify.com choose **Add new site -> Import from GitHub** and pick the repo. Leave build settings as they are (`netlify.toml` handles it).
2. Before deploying, open **Site configuration -> Environment variables** and add:

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_KEY` | your service_role key |
| `ADMIN_PASSWORD` | a strong password of your choice |
| `SECRET_KEY` | any long random text |
| `ANTHROPIC_API_KEY` | optional, makes the chatbot smarter |

3. Deploy. Shop: `https://your-site.netlify.app`  Admin: `https://your-site.netlify.app/admin`

## Local testing (optional)
`npm i -g netlify-cli`, create `.env` with the variables above, run `netlify dev`.

## Notes
- Never put the service_role key in the HTML files; it lives only in Netlify variables.
- Pushing changes to GitHub redeploys automatically. Products added in the admin portal are stored in Supabase and appear instantly.
