#!/bin/sh
# src/game.html is written without <head>/<body> (the artifact preview wraps it itself),
# so this adds the document skeleton and writes a standalone index.html.
set -e
cd "$(dirname "$0")/.."
{
  printf '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  printf '<!-- Сгенерировано tools/build.sh из src/game.html — правьте исходник. -->\n</head>\n<body>\n'
  cat src/game.html
  printf '\n</body>\n</html>\n'
} > index.html
echo "index.html собран из src/game.html"
