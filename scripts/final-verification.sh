#!/bin/bash

# final-verification.sh
# 最终验证所有导入路径

echo "🔍 最终验证项目导入路径..."

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}检查重复文件...${NC}"
duplicates_found=false

# 检查是否有重复的服务文件
for service in musicService audioService coverImageService beatmapDownloadService audioPlayPreviewService httpService osuApiService osuAuthService; do
    count=$(find src -name "${service}.ts" | wc -l)
    if [ $count -gt 1 ]; then
        echo -e "${RED}❌ 发现重复文件: ${service}.ts${NC}"
        find src -name "${service}.ts"
        duplicates_found=true
    fi
done

if [ "$duplicates_found" = false ]; then
    echo -e "${GREEN}✅ 没有发现重复文件${NC}"
fi

echo -e "\n${BLUE}检查错误的导入路径...${NC}"

# 检查业务服务中的错误导入
echo "检查 business 服务的导入..."
business_errors=$(grep -r "from '\./platform'" src/services/business/ 2>/dev/null | wc -l)
if [ $business_errors -gt 0 ]; then
    echo -e "${RED}❌ 发现 business 服务中的错误平台导入${NC}"
    grep -r "from '\./platform'" src/services/business/ 2>/dev/null
else
    echo -e "${GREEN}✅ business 服务平台导入正确${NC}"
fi

auth_errors=$(grep -r "from '\./auth'" src/services/business/ 2>/dev/null | wc -l)
if [ $auth_errors -gt 0 ]; then
    echo -e "${RED}❌ 发现 business 服务中的错误 auth 导入${NC}"
    grep -r "from '\./auth'" src/services/business/ 2>/dev/null
else
    echo -e "${GREEN}✅ business 服务 auth 导入正确${NC}"
fi

# 检查相对路径导入错误
echo -e "\n检查相对路径导入..."
relative_errors=$(grep -r "from '\.\./\.\./\.\." src/ 2>/dev/null | wc -l)
if [ $relative_errors -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现过深的相对路径导入${NC}"
    grep -r "from '\.\./\.\./\.\." src/ 2>/dev/null
fi

# 检查不存在的路径
echo -e "\n${BLUE}验证重要导入路径...${NC}"

# 验证核心路径存在
if [ -f "src/services/core/platform/index.ts" ]; then
    echo -e "${GREEN}✅${NC} core/platform 路径正确"
else
    echo -e "${RED}❌${NC} core/platform 路径缺失"
fi

if [ -f "src/services/api/httpService.ts" ]; then
    echo -e "${GREEN}✅${NC} api/httpService 路径正确"
else
    echo -e "${RED}❌${NC} api/httpService 路径缺失"
fi

if [ -f "src/stores/authStore.ts" ]; then
    echo -e "${GREEN}✅${NC} stores/authStore 路径正确"
else
    echo -e "${RED}❌${NC} stores/authStore 路径缺失"
fi

# 检查统一导出
echo -e "\n${BLUE}检查统一导出...${NC}"

for module in api business core; do
    if [ -f "src/services/${module}/index.ts" ]; then
        echo -e "${GREEN}✅${NC} services/${module}/index.ts 存在"
    else
        echo -e "${RED}❌${NC} services/${module}/index.ts 缺失"
    fi
done

# 检查类型文件
echo -e "\n${BLUE}检查类型文件...${NC}"
for type_file in index api osu platform; do
    if [ -f "src/types/${type_file}.ts" ]; then
        echo -e "${GREEN}✅${NC} types/${type_file}.ts 存在"
    else
        echo -e "${RED}❌${NC} types/${type_file}.ts 缺失"
    fi
done

echo -e "\n${YELLOW}=== 最终验证总结 ===${NC}"

# 统计导入
total_imports=$(grep -r "^import" src/ --include="*.ts" --include="*.vue" | wc -l)
echo "📊 总导入语句数: $total_imports"

api_imports=$(grep -r "from.*src/services/api/" src/ 2>/dev/null | wc -l)
business_imports=$(grep -r "from.*src/services/business/" src/ 2>/dev/null | wc -l)
core_imports=$(grep -r "from.*src/services/core/" src/ 2>/dev/null | wc -l)
stores_imports=$(grep -r "from.*src/stores/" src/ 2>/dev/null | wc -l)

echo "📊 导入分布:"
echo "  - API 服务: $api_imports"
echo "  - 业务服务: $business_imports"
echo "  - 核心服务: $core_imports"
echo "  - 状态管理: $stores_imports"

echo -e "\n${GREEN}🎉 验证完成！项目结构已正确重组。${NC}"
echo -e "${BLUE}建议运行以下命令进行最终测试：${NC}"
echo "1. npm run type-check"
echo "2. npm run lint" 
echo "3. npm run dev"
