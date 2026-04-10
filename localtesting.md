1. Edit e2b.Dockerfile
       ↓
2. docker build -t test .          ← Fast (cached, 30 sec)
       ↓
3. docker run -it test /bin/bash
   → npm run build  ← Does it pass?
       ↓ YES
4. e2b template build              ← Upload once, slow (5–10 min)
       ↓
5. Test full AI pipeline via localhost:8288 Inngest UI

docker build -f e2b.Dockerfile -t test .
docker run -it test /bin/bash

# Inside: manually verify
cat vite.config.ts      # Is tailwind imported correctly?
npm run build           # Does it actually build?
ls node_modules         # Are all packages there?


#Inngest

# .env.local
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local

npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
localhost:8288