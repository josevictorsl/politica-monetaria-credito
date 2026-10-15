"""Exporta uma versão auditável da pesquisa; usa somente a biblioteca padrão.

python scripts/exportar_dados.py --source-root /caminho/para/pasta/com/saidas
Não executa coleta, interpolação ou regressões.
"""
import argparse
import csv
import hashlib
import json
import math
import shutil
from collections import defaultdict
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
SOURCES = {}

BR_SERIES = [
    ("agregados_livre_pj", "Crédito livre · empresas"),
    ("agregados_livre_pf", "Crédito livre · famílias"),
    ("agregados_livre", "Crédito livre · total"),
    ("agregados_dir_pj", "Crédito direcionado · empresas"),
    ("agregados_dir_pf", "Crédito direcionado · famílias"),
    ("agregados_dir", "Crédito direcionado · total"),
    ("agregados_pj", "Crédito total · empresas"),
    ("agregados_pf", "Crédito total · famílias"),
    ("agregados_total", "Crédito total"),
]
US_SERIES = [
    ("Commercial Paper - Non-financial AA - 90-Day", "Commercial paper · não financeiras", "Commercial paper: non-financial firms"),
    ("Commercial Paper - Financial AA - 90-Day", "Commercial paper · financeiras", "Commercial paper: financial firms"),
    ("Mortgage - 5/1 year adjustable rate", "Hipoteca · taxa ajustável 5/1", "Mortgage: 5/1-year adjustable rate"),
    ("Mortgage - 30 years", "Hipoteca · 30 anos", "Mortgage: 30 years"),
    ("Bank Prime Loan Rate", "Taxa prime bancária", "Bank prime loan rate"),
    ("Baa - 20 years", "Títulos corporativos · Baa", "Baa: 20 years"),
    ("Credit Spread", "Spread de crédito", "Credit spread"),
    ("Excess Bond Premium", "Prêmio excedente de títulos", "Excess bond premium"),
    ("Personal loans (24 months)", "Empréstimo pessoal · 24 meses", "Personal loans: 24 months"),
    ("Consumer Loans - New Autos (48 months)", "Automóveis · 48 meses", "Consumer loans: new autos, 48 months"),
    ("Consumer loans - New autos (60 months)", "Automóveis · 60 meses", "Consumer loans: new autos, 60 months"),
    ("Credit Card - accounts assessed interest", "Cartão · contas com juros", "Credit card: accounts assessed interest"),
    ("Credit Card - all accounts", "Cartão · todas as contas", "Credit card: all accounts"),
]

BRANCH_LABELS = {
    "livre_pf": "Livre · famílias", "livre_pj": "Livre · empresas",
    "dir_pf": "Direcionado · famílias", "dir_pj": "Direcionado · empresas",
}
CATEGORY_LABELS = {
    "Credito pessoal": "Crédito pessoal", "Renegociacao": "Renegociação",
    "Aquisicao de bens": "Aquisição de bens", "Cartao de credito total": "Cartão de crédito total",
    "Cartao de credito": "Cartão de crédito", "Desconto de duplicatas e recebiveis": "Desconto de duplicatas e recebíveis",
    "Antecipacao de faturas de cartao": "Antecipação de faturas de cartão",
    "Financiamento a importacoes": "Financiamento a importações", "Financiamento a exportacoes": "Financiamento a exportações",
    "Credito rural: taxas de mercado": "Crédito rural: taxas de mercado", "Credito rural: taxas reguladas": "Crédito rural: taxas reguladas",
    "Financiamento imobiliario: taxas de mercado": "Financiamento imobiliário: taxas de mercado",
    "Financiamento imobiliario: taxas reguladas": "Financiamento imobiliário: taxas reguladas",
    "Microcredito: consumo": "Microcrédito: consumo", "Microcredito: microempreendedores": "Microcrédito: microempreendedores",
    "Nao detalhado pelas subseries": "Não detalhado pelas séries subjacentes",
}

MOTIVATION = [
    dict(id="credito-pib", figure="figura_01_credito_pib_brasil", data="credito_pct_pib", theme="Escala e custo", title="Crédito no Brasil (% do PIB)", source="Banco Central do Brasil", period="2007–2025", question="Qual é a escala do mercado de crédito?", description="A evolução do saldo em relação ao PIB dimensiona a relevância do financiamento na economia. Recursos livres e direcionados têm trajetórias distintas.", note="Indicador de tamanho do mercado. Uma expansão do saldo não mede, por si só, a intensidade do repasse às taxas de crédito."),
    dict(id="spread-internacional", figure="figura_02_spread_internacional", data="spread_internacional_ultimo", theme="Escala e custo", title="Spread de juros na comparação internacional", source="Banco Mundial", period="Última observação por país · 2017–2024", question="Em que contexto de custo o repasse brasileiro ocorre?", description="O Brasil apresenta spread elevado na comparação disponível. A margem entre taxas de empréstimo e de captação ajuda a contextualizar o custo da intermediação.", note="Última observação disponível por país entre 2017 e 2024. Os anos diferem; a figura descreve ordens de magnitude, não uma comparação no mesmo ano ou uma relação causal."),
    dict(id="composicao", figure="figura_10_composicao_credito_brasil", data="credito_pct_pib", theme="Segmentação e spreads", title="Composição do saldo: crédito livre e direcionado", source="Banco Central do Brasil", period="2007–2025", question="Quanto do mercado opera em cada regime de recursos?", description="A participação de recursos livres e direcionados muda ao longo do tempo. Mesmo com modalidades estáveis, mudanças de composição podem alterar o agregado.", note="A composição fornece contexto institucional. Não identifica separadamente o efeito do direcionamento de recursos sobre os coeficientes estimados."),
    dict(id="tjlp-tlp", figure="figura_11_tjlp_tlp_selic", data="taxas_mensais", theme="Taxas de referência", title="TJLP, TLP e Selic meta", source="Banco Central do Brasil", period="2000–junho de 2026 · TLP a partir de 2018", question="As referências do financiamento acompanham a Selic?", description="TJLP e TLP seguem regras e trajetórias próprias. A transição para a TLP em 2018 não elimina as diferenças de nível e dinâmica entre os indexadores.", note="Taxas apresentadas em percentual ao ano. A coexistência de referências distintas motiva uma análise por modalidade, sem provar um mecanismo causal de repasse."),
    dict(id="spread-livre", figure="figura_12_spread_novas_operacoes", data="spread_operacoes_nao_direcionadas", theme="Segmentação e spreads", title="Spreads das novas operações de crédito livre", source="Banco Central do Brasil", period="2000–2026 · observações de 2026 parciais", question="Famílias e empresas enfrentam os mesmos spreads?", description="O diferencial entre a taxa de crédito livre e a Selic é maior para famílias. O agregado combina tomadores com condições de risco e precificação diferentes.", note="Spread em pontos percentuais: taxa de crédito anual menos Selic anual. Diferenças descritivas de spread não isolam as causas do repasse heterogêneo."),
    dict(id="credito-bis", figure="figura_13_credito_gdp_bis", data="credito_gdp_bis", theme="Comparação internacional", title="Crédito ao setor privado não financeiro (% do PIB)", source="Bank for International Settlements (BIS)", period="2000–2025 · frequência trimestral", question="Como a profundidade financeira difere entre países?", description="O crédito ao setor privado não financeiro dimensiona o mercado brasileiro em relação ao americano. A comparação complementa a análise das taxas e dos spreads.", note="O conceito de crédito do BIS difere do saldo bancário do BCB. Maior profundidade financeira não implica, por si só, maior repasse de surpresas monetárias."),
    dict(id="selic-tr", figure="figura_14_selic_tr", data="taxas_mensais", theme="Taxas de referência", title="Selic meta e Taxa Referencial (TR)", source="Banco Central do Brasil", period="2000–junho de 2026", question="Todos os indexadores respondem proporcionalmente à taxa básica?", description="A TR apresenta movimentos amortecidos e descontínuos em relação à Selic. Contratos associados a regras específicas podem ter trajetórias distintas da taxa básica.", note="A TR mensal está convertida para equivalente anual composto; a Selic é a taxa anual. A figura contextualiza regras de indexação, sem estimar seus efeitos causais."),
]


def rows(root, relative):
    path = root / relative
    SOURCES[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def number(row, key):
    value = float(row[key])
    if not math.isfinite(value):
        raise ValueError(f"Valor não finito: {key}")
    return value


def estimate(country, series_id, label, sample, shock, row, keys, first, last, frequency):
    beta, se, p, n, r2 = (number(row, key) for key in keys)
    if not (se > 0 and 0 <= p <= 1 and n > 3 and first <= last):
        raise ValueError(f"Estimativa inválida: {country}/{label}/{sample}/{shock}")
    return dict(country=country, seriesId=series_id, label=label, sample=sample,
                shock=shock, beta=beta, se=se, p=p, n=int(n), r2=r2,
                first=first, last=last, frequency=frequency,
                ciLow=beta - 1.96 * se, ciHigh=beta + 1.96 * se)


def brazil_credit(root, coefficients):
    prefix = "saidas/dados_coletados/atualizacao_figuras_artigo_referencia/dados_processados/"
    source = rows(root, prefix + "detalhamento_saldo_credito_ultimo_ponto.csv")
    history = rows(root, prefix + "composicao_saldo_credito_pf_pj.csv")
    dates = {r["date"] for r in source}
    totals = {number(r, "total_balance") for r in source}
    if len(dates) != 1 or len(totals) != 1:
        raise ValueError("A composição precisa usar uma única data e um único saldo total")
    reference_date, total = dates.pop(), totals.pop()
    latest = max(history, key=lambda r: r["date"])
    if latest["date"] != reference_date or number(latest, "total_quatro") != total:
        raise ValueError("A decomposição diverge do último mês da composição histórica")
    details = []
    for r in source:
        branch = r["branch"]
        if branch not in BRANCH_LABELS:
            raise ValueError(f"Segmento desconhecido: {branch}")
        value = number(r, "value")
        share = number(r, "share_total_pct")
        branch_share = number(r, "share_branch_pct")
        branch_balance = number(r, "branch_balance")
        if not math.isclose(share, value / total * 100, abs_tol=1e-9) or not math.isclose(branch_share, value / branch_balance * 100, abs_tol=1e-9):
            raise ValueError("Participação de modalidade diverge do saldo")
        item = dict(id=branch + "_" + r["sgs_code"], branch=branch,
                    label=CATEGORY_LABELS.get(r["category"], r["category"]),
                    value=value, shareTotal=share, shareBranch=branch_share,
                    residual=r["is_residual"] == "True", sgsCode=r["sgs_code"],
                    rateSeriesId=r["rate_series_id"] or None, mapping=r["beta_status"], estimates={})
        for shock in ["DI30", "DI90"]:
            key = "beta_" + shock.lower()
            if not r[key]:
                item["estimates"][shock] = None
                continue
            matches = [c for c in coefficients if c["base_surpresa"] == "brasil_completo" and c["series_id"] == r["rate_series_id"] and c["choque"] == shock]
            if len(matches) != 1 or not math.isclose(number(r, key), number(matches[0], "beta"), abs_tol=1e-12):
                raise ValueError(f"Beta da decomposição diverge da regressão: {item['id']}/{shock}")
            c = matches[0]
            beta, se, p = number(c, "beta"), number(c, "std_error_hc0"), number(c, "p_value")
            if se <= 0 or not 0 <= p <= 1:
                raise ValueError("Inferência inválida na distribuição")
            item["estimates"][shock] = dict(beta=beta, se=se, p=p, n=int(c["n_obs"]),
                first=c["primeira_reuniao"], last=c["ultima_reuniao"], ciLow=beta - 1.96 * se, ciHigh=beta + 1.96 * se)
        details.append(item)
    if len(details) != 45 or len({r["id"] for r in details}) != 45:
        raise ValueError("Esperava 45 modalidades/resíduos únicos na decomposição")
    branches = []
    for branch, label in BRANCH_LABELS.items():
        subset = [r for r in source if r["branch"] == branch]
        balances = {number(r, "branch_balance") for r in subset}
        value = number(latest, branch)
        if balances != {value} or not math.isclose(sum(number(r, "value") for r in subset), value, abs_tol=.01):
            raise ValueError("As modalidades não fecham o saldo de seu segmento")
        branches.append(dict(id=branch, label=label, value=value, shareTotal=value / total * 100))
    if not math.isclose(sum(r["value"] for r in branches), total, abs_tol=.01):
        raise ValueError("Os segmentos não fecham o saldo total")
    for shock, expected in [("DI30", [30.87, 47.40, 12.36]), ("DI90", [24.32, 50.39, 15.93])]:
        mapped = [r for r in details if r["estimates"][shock] is not None]
        coverage = sum(r["shareTotal"] for r in mapped)
        bins = [sum(r["shareTotal"] for r in mapped if condition(r["estimates"][shock]["beta"]))
                for condition in [lambda beta: beta <= 0, lambda beta: 0 < beta <= 1, lambda beta: beta > 1]]
        if round(coverage, 2) != 90.64 or [round(v, 2) for v in bins] != expected:
            raise ValueError(f"A distribuição por {shock} diverge das âncoras do estudo")
    return dict(date=reference_date, total=total, unit="R$ milhões", branches=branches, details=details)


def motivation_files(root):
    prefix = "saidas/dados_coletados/atualizacao_figuras_artigo_referencia/"
    pictures, data_files, exported = {}, {}, []
    for figure in MOTIVATION:
        relative = prefix + "graficos/" + figure["figure"] + ".png"
        picture = root / relative
        content = picture.read_bytes()
        if not content.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError(f"Figura inválida: {relative}")
        SOURCES[relative] = hashlib.sha256(content).hexdigest()
        pictures[figure["id"]] = picture
        data_name = figure["data"]
        if data_name not in data_files:
            relative_data = prefix + "dados_processados/" + data_name + ".csv"
            if not rows(root, relative_data):
                raise ValueError(f"Dados de motivação vazios: {relative_data}")
            data_files[data_name] = root / relative_data
        exported.append({key: value for key, value in figure.items() if key not in ["figure", "data"]} | dict(image="figuras/motivacao/" + figure["id"] + ".png", dataFile="dados/motivacao/" + data_name + ".csv"))
    by_id = {figure["id"]: figure for figure in exported}
    pib = rows(root, prefix + "dados_processados/credito_pct_pib.csv")
    by_id["credito-pib"]["chart"] = dict(kind="line", xType="linear", xTitle="Ano", yTitle="Percentual do PIB", series=[
        series_from(pib, "Recursos livres", "year", "credito_livre_pct_pib"),
        series_from(pib, "Recursos direcionados", "year", "credito_dir_pct_pib"),
        series_from(pib, "Total", "year", "credito_total_pct_pib"),
    ], markers=[2015, 2018, 2025])
    by_id["composicao"]["chart"] = dict(kind="area", xType="linear", xTitle="Ano", yTitle="Percentual do crédito total", series=[
        series_from(pib, "Recursos livres", "year", "share_livre", derived=lambda r: number(r, "Saldo - Recursos Livres") / (number(r, "Saldo - Recursos Livres") + number(r, "Saldo - Recursos Direcionados")) * 100),
        series_from(pib, "Recursos direcionados", "year", "share_direcionado", derived=lambda r: number(r, "Saldo - Recursos Direcionados") / (number(r, "Saldo - Recursos Livres") + number(r, "Saldo - Recursos Direcionados")) * 100),
    ], markers=[2015, 2018, 2025])
    spread = rows(root, prefix + "dados_processados/spread_internacional_ultimo.csv")
    spread.sort(key=lambda r: number(r, "spread_pct"))
    by_id["spread-internacional"]["chart"] = dict(kind="bar", xType="linear", xTitle="Spread (p.p.)", yTitle="País · ano da observação", markers=[], series=[dict(label="Spread", points=[dict(x=number(r, "spread_pct"), y=r["country"], text=f"{r['country']} · {r['year']}<br>{number(r, 'spread_pct'):.2f} p.p.", color="#ae5644" if r["country_code"] == "BRA" else "#385f7a") for r in spread])])
    rates = rows(root, prefix + "dados_processados/taxas_mensais.csv")
    filtered_rates = [r for r in rates if r["date"] >= "2000-01-01"]
    by_id["tjlp-tlp"]["chart"] = dict(kind="line", xType="date", xTitle="Data", yTitle="Percentual ao ano", series=[series_filter(filtered_rates, "TJLP", "date", "value", source_name="series_name", match="TJLP"), series_filter(filtered_rates, "TLP", "date", "value", source_name="series_name", match="TLP"), series_filter(filtered_rates, "Selic meta", "date", "value", source_name="series_name", match="Selic")], markers=["2018-01-01"])
    spread_rows = rows(root, prefix + "dados_processados/spread_operacoes_nao_direcionadas.csv")
    yearly = defaultdict(list)
    labels = {"Agregados | livre": "Crédito livre · total", "Agregados | livre_pf": "Crédito livre · famílias", "Agregados | livre_pj": "Crédito livre · empresas"}
    for r in spread_rows:
        if r["series_name"] in labels and r["date"] >= "2000-01-01":
            yearly[(r["date"][:4], r["series_name"])].append(number(r, "spread"))
    annual_spread = [{"year": year, "series": series_name, "mean": sum(values) / len(values)} for (year, series_name), values in yearly.items()]
    annual_spread.sort(key=lambda r: (r["series"], r["year"]))
    by_id["spread-livre"]["chart"] = dict(kind="line", xType="linear", xTitle="Ano", yTitle="Taxa de crédito menos Selic (p.p.)", series=[series_filter(annual_spread, labels[name], "year", "mean", source_name="series", match=name) for name in labels], markers=[])
    bis = [r for r in rows(root, prefix + "dados_processados/credito_gdp_bis.csv") if r["date"] >= "2000-01-01"]
    by_id["credito-bis"]["chart"] = dict(kind="line", xType="date", xTitle="Ano", yTitle="Percentual do PIB", series=[series_filter(bis, name, "date", "value", source_name="country", match=name) for name in ["Brasil", "Estados Unidos"]], markers=[])
    by_id["selic-tr"]["chart"] = dict(kind="line", xType="date", xTitle="Data", yTitle="Percentual ao ano", series=[series_filter(filtered_rates, "Selic meta", "date", "value", source_name="series_name", match="Selic"), series_filter(filtered_rates, "TR · anualização composta", "date", "value", source_name="series_name", match="TR")], markers=[])
    composition = by_id["composicao"]["chart"]["series"]
    if len(composition[0]["points"]) != len(composition[1]["points"]) or any(not math.isclose(a["y"] + b["y"], 100, abs_tol=1e-9) for a, b in zip(composition[0]["points"], composition[1]["points"])):
        raise ValueError("As participações livre/direcionado precisam somar 100% em cada período")
    bis_chart = by_id["credito-bis"]["chart"]
    if bis_chart["xType"] != "date" or any(not point["x"].startswith("20") for series in bis_chart["series"] for point in series["points"]):
        raise ValueError("A escala temporal do BIS deve preservar datas ISO trimestrais")
    return exported, pictures, data_files


def series_from(source, label, x_key, y_key, derived=None):
    selected = [r for r in source if int(r[x_key]) >= 2000]
    return dict(label=label, points=[dict(x=int(r[x_key]), y=derived(r) if derived else number(r, y_key), text=f"{int(r[x_key])} · {label}") for r in selected])


def series_filter(source, label, x_key, y_key, source_name=None, match=None):
    selected = [r for r in source if source_name is None or r[source_name] == match]
    selected.sort(key=lambda r: r[x_key])
    return dict(label=label, points=[dict(x=int(r[x_key]) if x_key == "year" else r[x_key], y=number(r, y_key), text=f"{label}<br>{r[x_key]}<br>{number(r, y_key):.2f}") for r in selected])


def brazil_robustness(root, coefficients):
    prefix = "saidas/resultados_regressoes/brasil_tempdisagg/"
    robust = rows(root, prefix + "tabelas/robustez_hac_newey_west_brasil.csv")
    selected_series = ["Crédito livre: empresas", "Crédito livre: famílias", "Direcionado: empresas", "Direcionado: famílias", "Crédito livre", "Crédito direcionado"]
    methods = {"HC0": ("beta", "se_hc0", "p_hc0"), "HC3": ("beta", "se_hc3", "p_hc3"), "HAC · 4 defasagens": ("beta", "se_hac_nw_lag4", "p_hac_nw_lag4")}
    comparisons = []
    for series_name in selected_series:
        for shock_label, shock in [("DI-30", "DI30"), ("DI-90", "DI90")]:
            found = [r for r in robust if r["base_surpresa"] == "brasil_completo" and r["series"] == series_name and r["choque"] == shock_label]
            if len(found) != 1:
                raise ValueError(f"Robustez ausente ou duplicada: {series_name}/{shock_label}")
            row = found[0]
            for method, keys in methods.items():
                beta, se, p = (number(row, key) for key in keys)
                if se <= 0 or not 0 <= p <= 1:
                    raise ValueError("Estatística de robustez inválida")
                comparisons.append(dict(series=series_name, shock=shock, method=method, beta=beta, se=se, p=p, n=int(row["n_obs"]), ciLow=beta - 1.96 * se, ciHigh=beta + 1.96 * se))
    rolling_rows = rows(root, prefix + "dados/rolling_betas_brasil.csv")
    rolling = []
    for series_key, label in [("Agregados | livre_pj", "Crédito livre · empresas"), ("Agregados | livre_pf", "Crédito livre · famílias")]:
        for shock in ["DI30", "DI90"]:
            points = [r for r in rolling_rows if r["series"] == series_key and r["choque"] == shock]
            if not points:
                raise ValueError(f"Janela móvel ausente: {series_key}/{shock}")
            rolling.append(dict(seriesKey=series_key, label=label, shock=shock, window=60, points=[dict(date=r["window_end_date"], beta=number(r, "beta"), low=number(r, "ci_lower"), high=number(r, "ci_upper")) for r in points]))
    chow = rows(root, prefix + "tabelas/teste_chow_brasil_2020.csv")
    structural = [dict(series=r["series"], shock="DI30" if r["shock"] == "DI-30" else "DI90", n=int(r["n_total"]), p=number(r, "p_value"), waldP=number(r, "p_wald_hc0"), reject=r["reject_5pct"] == "Sim") for r in chow]
    coefficient_series = {"Crédito livre: empresas": "agregados_livre_pj", "Crédito livre: famílias": "agregados_livre_pf", "Direcionado: empresas": "agregados_dir_pj", "Direcionado: famílias": "agregados_dir_pf", "Crédito livre": "agregados_livre", "Crédito direcionado": "agregados_dir"}
    for result in comparisons:
        source = [r for r in coefficients if r["base_surpresa"] == "brasil_completo" and r["series_id"] == coefficient_series[result["series"]] and r["choque"] == result["shock"]]
        if len(source) != 1 or not math.isclose(number(source[0], "beta"), result["beta"], abs_tol=1e-12):
            raise ValueError("Coeficiente robusto não confere com o resultado principal")
    return dict(comparisons=comparisons, rolling=rolling, structural=structural)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=SITE.parent)
    parser.add_argument("--version", default="2026.4")
    args = parser.parse_args()
    root = args.source_root.resolve()
    results = []
    br_path = "saidas/resultados_regressoes/brasil_tempdisagg/tabelas/"
    br = rows(root, br_path + "regressoes_brasil_tempdisagg_coeficientes.csv")
    credit = brazil_credit(root, br)
    motivation, pictures, motivation_data = motivation_files(root)
    robustness = brazil_robustness(root, br)
    for series_id, label in BR_SERIES:
        for sample, base in [("full", "brasil_completo"), ("historical", "brasil_historico_2003_2019")]:
            for shock in ["DI30", "DI90"]:
                matches = [r for r in br if r["series_id"] == series_id and r["base_surpresa"] == base and r["choque"] == shock]
                if len(matches) != 1:
                    raise ValueError(f"Esperava exatamente uma linha: {series_id}/{base}/{shock}")
                r = matches[0]
                results.append(estimate("BR", series_id, label, sample, shock, r,
                    ["beta", "std_error_hc0", "p_value", "n_obs", "r2"],
                    r["primeira_reuniao"], r["ultima_reuniao"], "Mensal · desagregada para diária"))

    us_path = "saidas/resultados_regressoes/eua_tempdisagg/tabelas/"
    mapping = {r["series"]: r for r in rows(root, us_path + "mapa_series_tempdisagg.csv")}
    frequencies = {"Daily": "Diária · observada", "Weekly": "Semanal · desagregada para diária", "Monthly": "Mensal · desagregada para diária", "Quarterly": "Trimestral · desagregada para diária"}
    for sample, suffix, panel_file in [
        ("full", "", "painel_eua_fomc_tempdisagg.csv"),
        ("historical", "_recorte_paper", "painel_eua_fomc_tempdisagg_historico_choques_ate_2016-11-02.csv"),
    ]:
        stats = rows(root, us_path + "regressoes_eua_fomc_tempdisagg" + suffix + ".csv")
        published = rows(root, us_path + ("tabela_coeficientes_eua_ff3_scheduled_ate_2026.csv" if sample == "full" else "tabela_coeficientes_eua_ff3_scheduled_recorte_paper.csv"))
        panel = rows(root, "saidas/interpolacao/eua_tempdisagg/dados/" + panel_file)
        dates = defaultdict(list)
        for r in panel:
            if all(r[k] and r[k] != "NA" for k in ["dy", "FF3", "dy_lag1", "dy_lag2"]):
                dates[r["series"]].append(r["event_date"])
        for index, (series, label, published_label) in enumerate(US_SERIES):
            matching = [r for r in stats if r["series"] == series and r["specification"] == "sem_constante" and r["shock"] == "FF3"]
            if len(matching) != 1:
                raise ValueError(f"Série americana duplicada ou ausente: {series}")
            r = matching[0]
            valid_dates = sorted(dates[series])
            if len(valid_dates) != int(r["observations"]):
                raise ValueError(f"N do painel diverge da regressão: {series}")
            reference = next(p for p in published if p["dependent_variable"] == published_label)
            if not math.isclose(float(reference["beta"]), float(r["coefficient"]), abs_tol=1e-12):
                raise ValueError(f"Tabela principal diverge da regressão: {series}")
            results.append(estimate("US", f"us_{index}", label, sample, "FF3", r,
                ["coefficient", "std_error_hc0", "p_value", "observations", "r_squared"],
                valid_dates[0], valid_dates[-1], frequencies[mapping[series]["periodicity_original"]]))

    shocks = []
    for r in rows(root, "saidas/dados_coletados/surpresas_brasil/surpresas_brasil_completa.csv"):
        for key in ["DI30", "DI90"]:
            shocks.append(dict(country="BR", shock=key, date=r["copom"], value=number(r, key) * 100, extension=r["copom"] >= "2020-01-01"))
    for r in rows(root, "saidas/dados_coletados/surpresas_fomc_jk/dados/jk_ff3_atual_eventos.csv"):
        if r["Event"] != "FOMC Rate Decision (Scheduled)" or r["date"] == "2020-03-03":
            continue
        shocks.append(dict(country="US", shock="FF3", date=r["date"], value=number(r, "FF3") * 100, extension=r["date"] >= "2017-01-01"))

    # Âncoras científicas e unicidade: erros de seleção impedem a publicação.
    if len(results) != 62 or len({(r["country"], r["seriesId"], r["sample"], r["shock"]) for r in results}) != 62:
        raise ValueError("Esperava 62 estimativas principais únicas")
    if len(shocks) != 657:
        raise ValueError("Esperava 200 eventos brasileiros por horizonte e 257 americanos")
    for shock, expected in [("DI30", 1.12), ("DI90", 0.93)]:
        actual = next(r for r in results if r["seriesId"] == "agregados_livre_pj" and r["sample"] == "full" and r["shock"] == shock)
        if round(actual["beta"], 2) != expected:
            raise ValueError("Âncora do crédito livre a empresas diverge do estudo")
    if any(r["date"] == "2020-03-03" for r in shocks if r["country"] == "US"):
        raise ValueError("Evento emergencial americano não deve entrar na amostra")

    pdf = root / "documentos/tcc_abnt/tcc_abnt_atualizado.pdf"
    if not pdf.read_bytes().startswith(b"%PDF-"):
        raise ValueError("Documento não é um PDF válido")
    SOURCES["documentos/tcc_abnt/tcc_abnt_atualizado.pdf"] = hashlib.sha256(pdf.read_bytes()).hexdigest()
    meta = dict(version=args.version, publishedDate=date.today().isoformat(),
                title="Política Monetária e Crédito", author="José Victor Santos Lopes",
                confidence="Intervalos de 95% por aproximação normal: beta ± 1,96 × erro-padrão HC0.",
                sources=SOURCES)
    target = SITE / "src/data"
    target.mkdir(parents=True, exist_ok=True)
    payload = dict(meta=meta, estimates=results, shocks=shocks, brazilCredit=credit, motivation=motivation, brazilRobustness=robustness)
    (target / "research.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    documents = SITE / "public/documentos"
    documents.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(pdf, documents / "estudo-completo.pdf")
    downloads = SITE / "public/dados"
    downloads.mkdir(parents=True, exist_ok=True)
    (downloads / "manifesto.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (downloads / "pesquisa.json").write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    with (downloads / "resultados.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    shutil.copyfile(root / "saidas/dados_coletados/atualizacao_figuras_artigo_referencia/dados_processados/detalhamento_saldo_credito_ultimo_ponto.csv", downloads / "composicao-brasil.csv")
    picture_dir = SITE / "public/figuras/motivacao"
    picture_dir.mkdir(parents=True, exist_ok=True)
    motivation_dir = downloads / "motivacao"
    motivation_dir.mkdir(parents=True, exist_ok=True)
    for name, picture in pictures.items():
        shutil.copyfile(picture, picture_dir / (name + ".png"))
    for name, data_file in motivation_data.items():
        shutil.copyfile(data_file, motivation_dir / (name + ".csv"))
    print(f"Versão {args.version}: {len(results)} estimativas, {len(shocks)} surpresas, {len(credit['details'])} modalidades/resíduos de composição, {len(motivation)} figuras de motivação, PDF e manifesto exportados e validados.")


if __name__ == "__main__":
    main()
