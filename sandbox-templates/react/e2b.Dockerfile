# You can use most Debian-based base images
FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive

# curl backs the readiness probes; lsof is required by the app's
# "kill -9 $(lsof -t -i:3000)" step, which reclaims the port before starting a
# new dev server. Without lsof that command fails into its `|| true`, the old
# server keeps port 3000, and the fresh one silently falls back to 3001 — so
# getHost(3000) would keep serving the previous process.
RUN apt-get update && apt-get install -y curl lsof && apt-get clean && rm -rf /var/lib/apt/lists/*

# The E2B v2 builder already provisions the `user` account, so useradd exits 9
# there. Guard it so the same Dockerfile works on a bare base image too.
RUN (id -u user >/dev/null 2>&1 || useradd -m -s /bin/bash user) && \
    mkdir -p /etc/sudoers.d && \
    echo "user ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/user && \
    chmod 0440 /etc/sudoers.d/user

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/vite-app

# Create the Vite React app
RUN npm create vite@6.2.0 . --yes -- --template react-ts

# Install Tailwind and standard dependencies
RUN npm install tailwindcss @tailwindcss/vite
RUN npm install clsx tailwind-merge framer-motion lucide-react zustand
RUN npm install react-router-dom react-hook-form @hookform/resolvers zod date-fns

# Install Core Radix UI Primitives commonly used by AI generators
RUN npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-slot \
    @radix-ui/react-dropdown-menu @radix-ui/react-accordion @radix-ui/react-toast @radix-ui/react-label \
    @radix-ui/react-separator @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-radio-group

# Everything shadcn/ui needs that the list above does not already cover.
# class-variance-authority is imported by every shadcn component; without it the
# sandbox build fails on an unresolved import.
RUN npm install class-variance-authority tw-animate-css embla-carousel-react
RUN npm install @radix-ui/react-aspect-ratio @radix-ui/react-scroll-area \
    @radix-ui/react-navigation-menu @radix-ui/react-tooltip @radix-ui/react-progress \
    @radix-ui/react-select @radix-ui/react-switch

# Ensure Tailwind is set up in vite.config.ts robustly and Vite allows E2B hosts.
# NOTE: the config and the seed stylesheet are COPYed from real files rather than
# written with `echo '...\n...'`. The E2B v2 builder strips backslashes out of RUN
# commands, so those heredoc-style echoes produced a single line with literal "n"
# characters in it — an unparseable vite.config.ts.
RUN npm install -D @types/node
COPY vite.config.ts /home/user/vite-app/vite.config.ts

# Seed stylesheet; `shadcn init` below rewrites it into the real Tailwind v4 shape.
COPY index.css /home/user/vite-app/src/index.css

# Setup alias in tsconfig.json and tsconfig.app.json to support @ paths if AI uses them.
# Both files matter: Vite type-checks through tsconfig.app.json, while the shadcn CLI
# resolves "@/lib/utils" through the ROOT tsconfig.json and aborts with "Could not load
# the workspace config" if it has no paths.
#
# `|` is used as the sed delimiter, and the inserted JSON is kept on one line, so that
# neither the path separators nor any newline needs a backslash (see note above).
RUN sed -i 's|"compilerOptions": {|"compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] },|' tsconfig.app.json

# The root tsconfig.json that `npm create vite` emits is references-only and has no
# "compilerOptions" key at all, so a substitution can never match it — the block has to
# be inserted after the opening brace instead.
RUN sed -i '1a "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } },' tsconfig.json

# Disable strict unused variable checks so unused AI imports don't crash the build
RUN sed -i 's/"noUnusedLocals": true/"noUnusedLocals": false/g' tsconfig.json tsconfig.app.json tsconfig.node.json || true
RUN sed -i 's/"noUnusedParameters": true/"noUnusedParameters": false/g' tsconfig.json tsconfig.app.json tsconfig.node.json || true

# --- shadcn/ui -----------------------------------------------------------------
# Baked in at IMAGE BUILD time, never per generation: running the CLI inside a
# live sandbox would add half a minute and a network dependency to every website
# the platform builds.
#
# Runs AFTER the tsconfig path aliases above, because `init` resolves "@/lib/utils"
# through them, and BEFORE the app is copied to /home/user below.
#
# The version is PINNED. `@latest` would mean a CLI release months from now can
# silently change what this image contains, or break the build outright.
#
# `init` also rewrites src/index.css into the Tailwind v4 shape — :root holding
# the raw values and an `@theme inline` block mapping them to real utilities. That
# is what lets generated sites write `bg-background` and `text-muted-foreground`
# instead of arbitrary var() values, and it replaces the hand-written block above,
# whose bare HSL triplets were invalid as `background-color: var(--background)`.
#
# Flag notes for the 4.x CLI:
#   -b radix       component library to generate against, matching the Radix
#                  primitives installed above.
#   -p nova        the preset. `init` prompts for one interactively even under
#                  --yes, which hangs/fails a non-interactive image build.
#   --no-reinstall answers the "re-install existing UI components?" prompt.
# `--defaults` is deliberately NOT used: in 4.x it expands to --template=next,
# which scaffolds a Next.js project on top of this Vite app. `--base-color` no
# longer exists; the resulting components.json still records neutral.
ENV CI=true
RUN npx --yes shadcn@4.16.2 init -y --no-reinstall -b radix -p nova

RUN npx --yes shadcn@4.16.2 add --yes --overwrite \
      button card badge separator input textarea label \
      accordion tabs dialog sheet avatar carousel tooltip \
      dropdown-menu navigation-menu skeleton aspect-ratio scroll-area sonner

# Fail the image build loudly if the CLI silently did nothing — a sandbox whose
# components are missing produces broken sites for every user until someone
# notices.
RUN test -f components.json && test -f src/components/ui/button.tsx \
    && test -f src/components/ui/carousel.tsx \
    && grep -q "@theme inline" src/index.css \
    && echo "shadcn OK: $(ls src/components/ui | wc -l) components"

# Move the Vite app to the home directory and cleanup.
# WORKDIR moves off vite-app first: the E2B builder checks that the working
# directory still exists before running each command, so leaving it pointed at
# the directory this step deletes fails the *next* one.
WORKDIR /home/user
RUN cp -a /home/user/vite-app/. /home/user/ && rm -rf /home/user/vite-app

RUN chown -R user:user /home/user

# Pre-create Vite's hidden cache directories so it doesn't crash trying to make them
RUN mkdir -p /home/user/node_modules/.vite /home/user/node_modules/.vite-temp

# Forcefully unlock the node_modules folder and the new cache folders
RUN chmod -R 777 /home/user/node_modules

USER user