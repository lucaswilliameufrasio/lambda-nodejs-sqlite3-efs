FROM --platform=linux/arm64 public.ecr.aws/lambda/nodejs:24

RUN microdnf install -y gcc gcc-c++ make python3 zip binutils && \
    microdnf clean all

WORKDIR /build

COPY package.json package-lock.json* ./

RUN npm install --omit=dev

COPY scripts/strip-modules.mjs ./strip-modules.mjs
COPY docker/cleanup.mjs ./
RUN node cleanup.mjs

COPY dist/ dist/
COPY run.sh run.sh

RUN chmod +x run.sh && \
    zip -r /build/lambda.zip dist run.sh node_modules
