# You can use most Debian-based base images
FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash user && \
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

# Ensure Tailwind is set up in vite.config.ts robustly and Vite allows E2B hosts
RUN npm install -D @types/node && \
    echo 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\nimport path from "path";\n\nexport default defineConfig({\n  server: { allowedHosts: true },\n  plugins: [react(), tailwindcss()],\n  resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "./src"),\n    },\n  },\n});' > vite.config.ts

# Configure basic Tailwind base layers in index.css
RUN echo '@import "tailwindcss";\n\n@layer base {\n  :root {\n    --background: 0 0% 100%;\n    --foreground: 222.2 84% 4.9%;\n    --card: 0 0% 100%;\n    --card-foreground: 222.2 84% 4.9%;\n    --popover: 0 0% 100%;\n    --popover-foreground: 222.2 84% 4.9%;\n    --primary: 222.2 47.4% 11.2%;\n    --primary-foreground: 210 40% 98%;\n    --secondary: 210 40% 96.1%;\n    --secondary-foreground: 222.2 47.4% 11.2%;\n    --muted: 210 40% 96.1%;\n    --muted-foreground: 215.4 16.3% 46.9%;\n    --accent: 210 40% 96.1%;\n    --accent-foreground: 222.2 47.4% 11.2%;\n    --destructive: 0 84.2% 60.2%;\n    --destructive-foreground: 210 40% 98%;\n    --border: 214.3 31.8% 91.4%;\n    --input: 214.3 31.8% 91.4%;\n    --ring: 222.2 84% 4.9%;\n    --radius: 0.5rem;\n  }\n}\n\n@layer base {\n  * {\n    border-color: var(--border);\n  }\n  body {\n    background-color: var(--background);\n    color: var(--foreground);\n  }\n}' > src/index.css

# Setup alias in tsconfig.json and tsconfig.app.json to support @ paths if AI uses them
RUN sed -i 's/"compilerOptions": {/"compilerOptions": {\n    "baseUrl": ".",\n    "paths": {\n      "@\/*": [".\/src\/*"]\n    },/' tsconfig.app.json || true
RUN sed -i 's/"compilerOptions": {/"compilerOptions": {\n    "baseUrl": ".",\n    "paths": {\n      "@\/*": [".\/src\/*"]\n    },/' tsconfig.json || true

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
ENV CI=true
RUN npx --yes shadcn@4.16.2 init --defaults --yes --base-color neutral

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

# Move the Vite app to the home directory and cleanup
RUN cp -a /home/user/vite-app/. /home/user/ && rm -rf /home/user/vite-app

RUN chown -R user:user /home/user

# Pre-create Vite's hidden cache directories so it doesn't crash trying to make them
RUN mkdir -p /home/user/node_modules/.vite /home/user/node_modules/.vite-temp

# Forcefully unlock the node_modules folder and the new cache folders
RUN chmod -R 777 /home/user/node_modules

USER user