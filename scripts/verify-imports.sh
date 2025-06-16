#!/bin/bash

# verify-imports.sh
# 快速验证项目导入路径是否正确

echo "🔍 验证项目导入路径..."

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否有旧的导入路径
echo -e "${BLUE}检查是否有未更新的旧导入路径...${NC}"

old_paths_found=false

# 检查各种旧路径
echo "检查 musicService 旧路径..."
if grep -r "from 'src/services/musicService'" src/ 2>/dev/null; then
    echo -e "${RED}❌ 发现旧的 musicService 导入路径${NC}"
    old_paths_found=true
fi

echo "检查 audioService 旧路径..."
if grep -r "from 'src/services/audioService'" src/ 2>/dev/null; then
    echo -e "${RED}❌ 发现旧的 audioService 导入路径${NC}"
    old_paths_found=true
fi

echo "检查 httpService 旧路径..."
if grep -r "from 'src/services/httpService'" src/ 2>/dev/null; then
    echo -e "${RED}❌ 发现旧的 httpService 导入路径${NC}"
    old_paths_found=true
fi

echo "检查 auth 旧路径..."
if grep -r "from 'src/services/auth'" src/ 2>/dev/null; then
    echo -e "${RED}❌ 发现旧的 auth 导入路径${NC}"
    old_paths_found=true
fi

echo "检查 osuApiService 旧路径..."
if grep -r "from 'src/services/osuApiService'" src/ 2>/dev/null; then
    echo -e "${RED}❌ 发现旧的 osuApiService 导入路径${NC}"
    old_paths_found=true
fi

echo "检查 osuAuthService 旧路径..."
if grep -r "from 'src/services/osuAuthService'" src/ 2>/dev/null; then
    echo -e "${RED}❌ 发现旧的 osuAuthService 导入路径${NC}"
    old_paths_found=true
fi

if [ "$old_paths_found" = false ]; then
    echo -e "${GREEN}✅ 未发现旧的导入路径${NC}"
fi

# 检查新的导入路径是否正确
echo -e "\n${BLUE}检查新的导入路径...${NC}"

echo "新的 API 服务导入:"
grep -r "from 'src/services/api/" src/ 2>/dev/null | head -5

echo -e "\n新的业务服务导入:"
grep -r "from 'src/services/business/" src/ 2>/dev/null | head -5

echo -e "\n新的核心服务导入:"
grep -r "from 'src/services/core/" src/ 2>/dev/null | head -5

echo -e "\n新的 stores 导入:"
grep -r "from 'src/stores/" src/ 2>/dev/null | head -5

# 检查类型导入
echo -e "\n${BLUE}检查类型导入...${NC}"
type_imports=$(grep -r "from 'src/types" src/ 2>/dev/null | wc -l)
echo "发现 $type_imports 个类型导入"

# 检查统一导出使用情况
echo -e "\n${BLUE}检查统一导出使用情况...${NC}"
unified_imports=$(grep -r "from 'src/services'" src/ 2>/dev/null | grep -v "src/services/[^/]*/" | wc -l)
echo "发现 $unified_imports 个统一服务导入"

# 验证关键文件存在
echo -e "\n${BLUE}验证重组后的文件结构...${NC}"

key_files=(
    "src/types/index.ts"
    "src/types/api.ts"
    "src/types/osu.ts"
    "src/types/platform.ts"
    "src/services/index.ts"
    "src/services/api/index.ts"
    "src/services/business/index.ts"
    "src/services/core/index.ts"
    "src/stores/index.ts"
    "src/utils/index.ts"
    "src/composables/index.ts"
)

missing_files=false
for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file (缺失)"
        missing_files=true
    fi
done

# 总结
echo -e "\n${YELLOW}=== 验证总结 ===${NC}"

if [ "$old_paths_found" = false ] && [ "$missing_files" = false ]; then
    echo -e "${GREEN}🎉 项目导入路径验证通过！${NC}"
    echo "✅ 所有旧路径已更新"
    echo "✅ 新文件结构完整"
    echo "✅ 可以继续进行类型检查"
else
    echo -e "${RED}⚠️  发现需要修复的问题${NC}"
    if [ "$old_paths_found" = true ]; then
        echo "❌ 存在未更新的旧导入路径"
    fi
    if [ "$missing_files" = true ]; then
        echo "❌ 存在缺失的关键文件"
    fi
fi

echo -e "\n${BLUE}💡 下一步建议：${NC}"
echo "1. 运行 'npm run type-check' 进行完整的类型检查"
echo "2. 运行 'npm run lint' 检查代码规范"
echo "3. 运行 'npm run dev' 测试应用启动"
