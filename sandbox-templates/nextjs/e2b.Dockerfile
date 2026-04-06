# You can use most Debian-based base images
FROM node:21-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

RUN npx --yes create-next-app@15.2.1 . --yes

RUN npm install tailwind-merge clsx
RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npm install tw-animate-css tailwindcss-animate
RUN npx --yes shadcn@2.6.3 add --all --yes

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app

# Ensure lib/utils.ts exists (shadcn sometimes places it inconsistently)
RUN if [ ! -f /home/user/lib/utils.ts ]; then \
  mkdir -p /home/user/lib && \
  echo 'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}' > /home/user/lib/utils.ts; \
fi
