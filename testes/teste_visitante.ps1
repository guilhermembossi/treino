# Tarefa 1.2, teste 1: visitante (sem login) não lê nem grava nada, pela API pública.
# Usa só a URL e a chave publicável (as mesmas do app). Rodar: powershell -File testes\teste_visitante.ps1
# Sandbox (tarefa 8.2): powershell -File testes\teste_visitante.ps1 -Esquema sandbox
param([ValidateSet('public', 'sandbox')][string]$Esquema = 'public')
$url   = 'https://ptxlgdbbycqwidpyywam.supabase.co/rest/v1'
$chave = 'sb_publishable__MZLUObi1t8ojIfzsc8fwA_SKhNwif-'
$cab   = @{ apikey = $chave; 'Content-Type' = 'application/json'; Prefer = 'return=representation'
           'Accept-Profile' = $Esquema; 'Content-Profile' = $Esquema }
# Corpo válido por tabela, para a recusa vir da permissão e não de coluna errada.
$z = '00000000-0000-0000-0000-000000000000'
$novos = [ordered]@{
  fichas           = '{"nome":"x"}'
  ficha_exercicios = "{`"ficha_id`":`"$z`",`"nome`":`"x`"}"
  ficha_series     = "{`"ficha_exercicio_id`":`"$z`",`"serie_n`":1}"
  treinos          = '{"nome_ficha":"x","inicio":"2026-01-01T00:00:00Z"}'
  treino_series    = "{`"treino_id`":`"$z`",`"exercicio_nome`":`"x`",`"serie_n`":1}"
  videos           = '{"nome":"x","chave":"x","url":"https://youtu.be/x"}'  # tarefa 8.7 (só existe no schema onde a migração já foi aplicada)
}
$tabelas = $novos.Keys
$falhas = 0

function Tentar($acao, $tabela, $metodo, $corpo) {
  $alvo = "$url/$tabela"
  if ($metodo -in 'PATCH', 'DELETE') { $alvo += '?id=not.is.null' }
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Method $metodo -Uri $alvo -Headers $cab -Body $corpo
    $script:falhas++
    "FALHOU  $acao $tabela -> HTTP $($r.StatusCode) $($r.Content)"
  } catch {
    $cod = [int]$_.Exception.Response.StatusCode
    if ($cod -in 401, 403) { "OK      $acao $tabela -> recusado (HTTP $cod)" }
    else { $script:falhas++; "FALHOU  $acao $tabela -> HTTP $cod (esperado 401/403)" }
  }
}

foreach ($t in $tabelas) {
  Tentar 'ler    ' $t 'GET' $null
  Tentar 'criar  ' $t 'POST' $novos[$t]
  Tentar 'alterar' $t 'PATCH' '{"atualizado_em":"2026-01-01T00:00:00Z"}'
  Tentar 'apagar ' $t 'DELETE' $null
}
if ($falhas) { "RESULTADO: $falhas falha(s)"; exit 1 } else { "RESULTADO ($Esquema): visitante recusado em tudo (24 de 24)" }
