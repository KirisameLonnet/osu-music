#!/bin/bash

# quick-type-check.sh
# 快速检查关键文件的类型错误

echo "🔍 快速类型检查..."

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查关键文件
key_files=(
    "src/types/index.ts"
    "src/composables/usePlatform.ts"
    "src/services/core/platform/types.ts"
    "src/stores/authStore.ts"
)

echo -e "${YELLOW}检查关键文件...${NC}"

for file in "${key_files[@]}"; do
    echo -n "检查 $file ... "
    if npx vue-tsc --noEmit "$file" 2>/dev/null; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
        echo "详细错误:"
        npx vue-tsc --noEmit "$file"
    fi
done

echo -e "\n${YELLOW}检查完成${NC}"
