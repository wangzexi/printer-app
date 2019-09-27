#/bin/bash

rm -rf build
npm run build
rm -rf build/win-unpacked
rsync -avzP --delete build/ root@hk2.zexi.me:/data/nginx/htmls/file.zexi.me/printer/
