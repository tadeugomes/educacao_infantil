-- Shortcodes que leem dados/bncc_3ano.csv
--   {{< habilidade EF03MA13 >}}  -> etiqueta com o código e o texto oficial (só no perfil professor)
--   {{< habilidades M2 >}}       -> tabela com todas as habilidades de um módulo (só no perfil professor)
-- No perfil aluno os dois não produzem nada: a criança vê objetivos escritos em linguagem própria.

local cache = nil

local function parse_csv_line(line)
  local res, field, i, inq = {}, {}, 1, false
  local n = #line
  while i <= n do
    local c = line:sub(i, i)
    if inq then
      if c == '"' then
        if line:sub(i + 1, i + 1) == '"' then
          field[#field + 1] = '"'; i = i + 1
        else
          inq = false
        end
      else
        field[#field + 1] = c
      end
    else
      if c == '"' then
        inq = true
      elseif c == ',' then
        res[#res + 1] = table.concat(field); field = {}
      else
        field[#field + 1] = c
      end
    end
    i = i + 1
  end
  res[#res + 1] = table.concat(field)
  return res, inq
end

local function project_dir()
  if quarto and quarto.project and quarto.project.directory then
    return quarto.project.directory
  end
  return "."
end

local function load()
  if cache then return cache end
  cache = { by_code = {}, by_module = {}, order = {} }
  local path = pandoc.path.join({ project_dir(), "dados", "bncc_3ano.csv" })
  local f = io.open(path, "r")
  if not f then
    quarto.log.warning("bncc: não encontrei " .. path)
    return cache
  end
  local content = f:read("a"); f:close()
  content = content:gsub("\r\n", "\n"):gsub("^\239\187\191", "")
  local header, pending = nil, nil
  for line in content:gmatch("([^\n]*)\n?") do
    if pending then line = pending .. "\n" .. line end
    local cols, open = parse_csv_line(line)
    if open then
      pending = line
    else
      pending = nil
      if not header then
        header = cols
      elseif #cols >= #header then
        local rec = {}
        for k, name in ipairs(header) do rec[name] = cols[k] end
        cache.by_code[rec.codigo] = rec
        cache.by_module[rec.modulo] = cache.by_module[rec.modulo] or {}
        table.insert(cache.by_module[rec.modulo], rec)
      end
    end
  end
  return cache
end

local function is_professor()
  if quarto and quarto.project and quarto.project.profile then
    for _, p in ipairs(quarto.project.profile) do
      if p == "professor" then return true end
    end
  end
  local env = os.getenv("QUARTO_PROFILE") or ""
  return env:find("professor") ~= nil
end

local function arg1(args)
  return args[1] and pandoc.utils.stringify(args[1]) or ""
end

return {
  habilidade = function(args)
    if not is_professor() then return pandoc.Null() end
    local code = arg1(args)
    local rec = load().by_code[code]
    if not rec then
      quarto.log.warning("bncc: código desconhecido " .. code)
      return pandoc.Span(pandoc.Str(code), { class = "bncc-tag bncc-erro" })
    end
    return pandoc.Span({
      pandoc.Strong(pandoc.Str(code)), pandoc.Space(), pandoc.Str(rec.texto)
    }, { class = "bncc-tag", title = rec.componente .. " · " .. rec.objetos })
  end,

  habilidades = function(args)
    if not is_professor() then return pandoc.Null() end
    local mod = arg1(args)
    local list = load().by_module[mod] or {}
    if #list == 0 then return pandoc.Para(pandoc.Str("Sem habilidades para " .. mod)) end
    local md = { "| Código | Componente | Habilidade | Fonte |", "|---|---|---|---|" }
    for _, r in ipairs(list) do
      local t = (r.texto or ""):gsub("|", "/")
      md[#md + 1] = string.format("| %s | %s | %s | %s |", r.codigo, r.componente, t, (r.fonte or ""):gsub("|", "/"))
    end
    local doc = pandoc.read(table.concat(md, "\n"), "markdown")
    return pandoc.Div(doc.blocks, { class = "bncc-tabela" })
  end,
}
