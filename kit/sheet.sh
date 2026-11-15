#!/bin/sh
# 用法：sh sheet.sh <页面> <输出> <秒> <ns> 级别...   每个级别抽一帧，拼成一行给自己看
# 每格的尺寸用 SIZE=960x540 改；某一级渲不出来时，会把报错原样打出来（多半是着色器编译错误）
page=$1; out=$2; t=$3; ns=$4; shift 4; d=$(mktemp -d); i=0; ins=""
for l in "$@"; do
  if ! node render.mjs --page $page --size ${SIZE:-1280x720} --q "level=$l&ns=$ns&label=0" --sheet $t --cols 1 --out $d/$i.jpg >$d/log 2>&1; then echo "级别 $l 渲染失败："; cat $d/log; rm -rf $d; exit 1; fi
  ins="$ins -i $d/$i.jpg"; i=$((i+1))
done
if [ $i -eq 1 ]; then cp $d/0.jpg $out; else ffmpeg -y -loglevel error $ins -filter_complex "hstack=$i" $out; fi; rm -rf $d; echo wrote $out
