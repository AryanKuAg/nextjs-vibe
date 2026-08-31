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


# Move the Vite app to the home directory and cleanup
RUN cp -a /home/user/vite-app/. /home/user/ && rm -rf /home/user/vite-app

RUN chown -R user:user /home/user

# Pre-create Vite's hidden cache directories so it doesn't crash trying to make them
RUN mkdir -p /home/user/node_modules/.vite /home/user/node_modules/.vite-temp

# Forcefully unlock the node_modules folder and the new cache folders
RUN chmod -R 777 /home/user/node_modules

USER user