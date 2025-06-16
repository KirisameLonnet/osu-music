#!/bin/bash

# update-imports.sh
# 批量更新项目中的导入路径

echo "🔄 开始更新导入路径..."

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
total_files=0
updated_files=0

# 更新函数
update_imports() {
    local old_path="$1"
    local new_path="$2"
    local description="$3"
    
    echo -e "${YELLOW}正在更新: $description${NC}"
    
    # 查找并替换
    files=$(find src -name "*.vue" -o -name "*.ts" -o -name "*.js" | grep -v node_modules)
    
    for file in $files; do
        if grep -q "$old_path" "$file"; then
            sed -i.bak "s|$old_path|$new_path|g" "$file"
            rm "$file.bak"
            echo "  ✓ 已更新: $file"
            ((updated_files++))
        fi
        ((total_files++))
    done
}

# 服务路径更新
echo -e "${GREEN}📁 更新服务导入路径...${NC}"

update_imports "src/services/auth" "src/stores/authStore" "认证服务移动到 stores"
update_imports "src/services/httpService" "src/services/api/httpService" "HTTP 服务移动到 api"
update_imports "src/services/osuApiService" "src/services/api/osuApiService" "OSU API 服务移动到 api"
update_imports "src/services/osuAuthService" "src/services/api/osuAuthService" "OSU 认证服务移动到 api"
update_imports "src/services/musicService" "src/services/business/musicService" "音乐服务移动到 business"
update_imports "src/services/audioService" "src/services/business/audioService" "音频服务移动到 business"
update_imports "src/services/coverImageService" "src/services/business/coverImageService" "封面服务移动到 business"
update_imports "src/services/beatmapDownloadService" "src/services/business/beatmapDownloadService" "下载服务移动到 business"
update_imports "src/services/audioPlayPreviewService" "src/services/business/audioPlayPreviewService" "预览服务移动到 business"
update_imports "src/services/platform" "src/services/core/platform" "平台服务移动到 core"

# 类型路径更新（如果有的话）
echo -e "${GREEN}📝 更新类型导入路径...${NC}"

# 检查是否有直接导入类型的情况，建议使用新的统一类型模块
files_with_types=$(find src -name "*.vue" -o -name "*.ts" | xargs grep -l "interface.*{" | head -5)
if [ ! -z "$files_with_types" ]; then
    echo -e "${YELLOW}💡 发现以下文件包含类型定义，建议迁移到 src/types/ 模块：${NC}"
    for file in $files_with_types; do
        echo "  - $file"
    done
fi

# 统计信息
echo ""
echo -e "${GREEN}✅ 更新完成！${NC}"
echo -e "📊 统计信息:"
echo -e "  - 检查的文件数: $total_files"
echo -e "  - 更新的文件数: $updated_files"

# 建议下一步操作
echo ""
echo -e "${YELLOW}🔧 建议的下一步操作：${NC}"
echo "1. 运行 'npm run type-check' 检查 TypeScript 错误"
echo "2. 运行 'npm run lint' 检查代码规范"
echo "3. 运行 'npm run dev' 测试应用是否正常启动"
echo "4. 逐个检查更新的文件，确保导入正确"

echo ""
echo -e "${GREEN}🎉 导入路径更新脚本执行完成！${NC}"
