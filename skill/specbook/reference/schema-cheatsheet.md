# SpecBook Schema 速查（skill 用）

> 這份是給 `/specbook init`、`/specbook enhance` 在寫 `.specbook/content/*` 時對照用的速查。
> 與 `src/schema/*` 的 zod 定義保持同步；發現對不上以 schema 為準、回過頭來改本檔。

## overview.md

```markdown
---
tagline: <一句話描述（必填、不可空）>
---

# <專案名（必填，第一個 H1）>

<至少一段散文（必填、不可空）>
```

**欄位說明**：
- `tagline`: 必填，最少 1 字元
- `title`: 對應 H1（必填，最少 1 字元）
- `body`: 正文內容（必填，最少 1 字元）

## tech-stack.yaml

```yaml
- layer: <分組標籤，例 Frontend / Backend / Tooling>   # 必填
  items:                                                # 至少一個 item
    - name: <技術名>            # 必填、最少 1 字元
      version: <版本字串>        # 可選
      role: <一句話說明角色>     # 必填、不可空
      icon: <單字母或圖片 URL>   # 可選
```

**條件**：
- 至少要有一個 layer
- 每個 layer 至少一個 item
- 每個 item 的 `name`、`role` 都必填且不可空

## architecture.md

```markdown
---
diagram: mermaid | image | none   # 必填
image: ./assets/x.png             # 當 diagram=image 時必填
---

<散文 body（必填、不可空）>
```

**條件**：
- `diagram`: 必填，只能是 `mermaid`、`image` 或 `none`
- `image`: 當 `diagram: image` 時必填；其他情況可選
- `body`: 必填，最少 1 字元；若 `diagram: mermaid` 時在 body 內以 ` ```mermaid ... ``` ` 區塊提供圖表程式碼

## user-stories.yaml

```yaml
- as: <角色>          # 必填、最少 1 字元
  want: <想做什麼>     # 必填、最少 1 字元
  soThat: <成果>       # 必填、最少 1 字元
  priority: p0|p1|p2  # 可選，預設 p1
```

**條件**：
- 至少要有一筆 story
- `as`、`want`、`soThat` 都必填且最少 1 字元
- `priority`: 可選，預設為 `p1`；只能是 `p0`、`p1` 或 `p2`

## roadmap.yaml

```yaml
- title: <里程碑名>            # 必填、最少 1 字元
  quarter: <自由格式時段>      # 可選（如 "2026 Q1" / "2026-05"）
  status: done | active | future   # 必填
  items:                        # 可選；該里程碑下的工作項
    - <字串>
```

**條件**：
- 至少要有一筆 milestone
- `title`、`status` 都必填
- `title`: 最少 1 字元
- `status`: 只能是 `done`、`active` 或 `future`
- `quarter`、`items` 都可選
- `items`: 若提供，至少一個；每項是字串，最少 1 字元

## 路徑慣例

- `.specbook/content/` 下放這 5 個檔
- frontmatter 內 `image` 路徑相對於 `.specbook/`
- `config.yaml` 內 `favicon`、`ogImage` 路徑也相對於 `.specbook/`
