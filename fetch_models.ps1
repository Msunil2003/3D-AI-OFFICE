$headers = @{ Authorization = "Bearer xpl_78e61a308243c856ff09cb6b44517d41e77eccdf" }
$response = Invoke-WebRequest -Headers $headers -Uri 'https://api.experientiallabs.ai/v1/models' -Method GET -UseBasicParsing
$data = $response.Content | ConvertFrom-Json

$results = @()
foreach ($m in $data.data) {
    $slug = $m.id
    try {
        $detail = Invoke-WebRequest -Headers $headers -Uri "https://api.experientiallabs.ai/api/models/$slug" -Method GET -UseBasicParsing
        $j = $detail.Content | ConvertFrom-Json
        $ctx = $j.model.context_window
        $out = $j.model.max_output_tokens
        $prov = $j.providers | Where-Object { $_.status -eq 'active' -and $_.routable -eq $true } | Select-Object -First 1
        if ($prov -and $prov.input_micro_usd_per_million -and $prov.output_micro_usd_per_million) {
            $results += [pscustomobject]@{
                slug = $slug
                name = $j.model.display_name
                context = $ctx
                output = $out
                input_cost = ($prov.input_micro_usd_per_million / 1000000)
                output_cost = ($prov.output_micro_usd_per_million / 1000000)
            }
        }
    } catch { }
}
$results | Sort-Object slug | ConvertTo-Json -Depth 4 | Out-File -FilePath "D:\PROJECTS\AI-OFFICE\model_details.json" -Encoding UTF8
"Done: $($results.Count) models with pricing"