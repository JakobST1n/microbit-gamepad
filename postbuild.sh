#!/bin/bash
PUBLISH_URL="/microbit-gamepad/"

cd "dist" || exit 1

VERSION=$(cat ../package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

tput setaf 4; echo "> Add service-worker.js..."; tput sgr0
cp ../src/service-worker.js ./service-worker.js

tput setaf 4; echo "> Add version number to files ($VERSION)..."; tput sgr0
sed -i".bak" "s/{{ VERSION }}/$VERSION/g" index.html
sed -i".bak" "s/{{ VERSION }}/$VERSION/g" service-worker.js

tput setaf 4; echo "> Add cache-files to webmanifest..."; tput sgr0
cache_files="'$PUBLISH_URL'";
for file in *; do
    if [[ "$file" =~ (manifest.webmanifest|.git|.bak) ]]; then
        continue
    fi
    if [[ "$cache_files" == "" ]]; then
        cache_files="'$PUBLISH_URL$file'"
    else
        cache_files="$cache_files,""'$PUBLISH_URL$file'"
    fi
done
sed -i".bak" "s|\"{{ CACHE_FILES }}\"|$cache_files|g" service-worker.js

tput setaf 4; echo "> Remove .bak-files..."; tput sgr0
rm *.bak

cd ..
