# Codexcali

Codexcali 是一个给 Codex 使用的本地白板插件。它把 Excalidraw 嵌入到当前项目中，让图片生成、标注反馈和结果整理都留在一张轻量的手绘风格画布上。

English README: [README.en.md](README.en.md)

## 可以做什么

- 为当前项目打开一张本地 Excalidraw 画布，用来摆放原图、草图、提示词和生成结果。
- 自动把画布文件和图片资源写入项目目录，便于随项目一起保留、移动或提交。
- 在画布上放置 AI 图片占位框，Codex 可以读取选中占位框并把生成结果写回对应位置。
- 把带圈注、箭头或文字说明的截图交给 Codex 后，将清理后的新图插到原图旁边，保留对照关系。
- 通过 MCP 工具让 Codex 查询画布选择状态、创建占位框、写入图片资源、保存页面。

## 本地文件

默认情况下，Codexcali 不使用云端存储。每个项目会生成自己的 `codexcali/` 目录：

```text
codexcali/
  pages/
    <page-id>/
      codexcali-canvas.excalidraw.json
      assets/
```

可配置环境变量：

- `CODEXCALI_PORT`：本地画布服务端口，默认 `43218`。
- `CODEXCALI_PROJECT_DIR`：指定当前项目目录。
- `CODEXCALI_CANVAS_DIR`：指定画布数据目录；未设置时使用 `$CODEXCALI_PROJECT_DIR/codexcali`。

## 安装方式

### 方式一：让 Codex 安装

在 Codex 中发出类似下面的请求：

```text
请安装 GitHub 仓库 https://github.com/Yipalex/codexcali.git 中的 Codexcali 插件。
安装目标为 ~/plugins/codexcali。安装后请执行 npm install 和 npm run build，
并把它注册到 personal marketplace，最后安装 codexcali@personal。
```

### 方式二：手动安装

```bash
mkdir -p ~/plugins
git clone https://github.com/Yipalex/codexcali.git ~/plugins/codexcali
cd ~/plugins/codexcali
npm install
npm run build
```

然后确认个人 marketplace 中有 `codexcali` 条目。默认文件位置是 `~/.agents/plugins/marketplace.json`，条目示例：

```json
{
  "name": "codexcali",
  "source": {
    "source": "local",
    "path": "./plugins/codexcali"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

安装插件：

```bash
codex plugin add codexcali@personal
```

安装完成后开启新的 Codex 对话，以便加载新的 skill 和 MCP 工具。

## 使用示例

打开画布：

```text
Open the Codexcali canvas for this project.
```

填充选中的图片占位框：

```text
Generate an image for the selected Codexcali holder.
```

根据标注截图生成干净版本：

```text
Create a clean revised image from this Codexcali annotation screenshot and place it beside the original.
```

默认访问地址：

```text
http://127.0.0.1:43218/
```

## MCP 工具

- `codexcali:open-canvas`：启动或复用本地画布服务。
- `codexcali:get-selection`：读取当前页面、选中元素、选中 holder、页面路径和资源目录。
- `codexcali:create-image-holder`：创建可被 Codex 填充的图片占位框。
- `codexcali:insert-image`：将图片保存到页面资源目录，并插入画布或选中 holder。
- `codexcali:save-page`：保存当前页面。
- `codexcali:place-clean-edit-beside-original`：将清理后的修订图放到选中原图旁边。

## 开发

```bash
npm install
npm run dev:server
npm run dev
```

生产构建和校验：

```bash
npm run build
npm test
```

## 许可证

本项目采用 MIT 许可证。Excalidraw 依赖同样采用 MIT 许可证。

## 灵感致谢

Codexcali 的命名方式和“在 Codex 中用本地画布辅助 AI 图片工作”的产品方向受到 Cowart 启发。Codexcali 是基于 Excalidraw 的独立洁净实现。

Cowart GitHub 项目地址：[https://github.com/zhongerxin/cowart](https://github.com/zhongerxin/cowart)
