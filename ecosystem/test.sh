#!/bin/bash

set -e

cd ..
if [ ! -d "lib" ] || [ -z "$(ls -A lib)" ]; then
  echo "Error: lib folder is missing or empty"
  exit 1
fi

if [ $? -eq 0 ]; then
  echo "Creating package tarball..."
  npm pack --pack-destination build
else
  echo "Build failed"
  exit 1
fi

projects=("deno:deno" "bun:bun"  "npm:node-js" "npm:node-ts" "npm:browser")

for project in "${projects[@]}"; do
  folder=$(echo $project | cut -d':' -f2)
  echo "Testing ecosystem project: $folder"
  cd "ecosystem/$folder"

  echo "Installing dependencies for $folder..."
  manager=$(echo $project | cut -d':' -f1)
  $manager install

  echo "Running tests for $folder..."
  $manager test

  cd ../..
done

echo "Ecosystem tests completed"