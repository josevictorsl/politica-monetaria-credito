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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=SITE.parent)
    parser.add_argument("--version", default="2026.1")
    args = parser.parse_args()
    root = args.source_root.resolve()
    results = []
    br_path = "saidas/resultados_regressoes/brasil_tempdisagg/tabelas/"
    br = rows(root, br_path + "regressoes_brasil_tempdisagg_coeficientes.csv")
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
    payload = dict(meta=meta, estimates=results, shocks=shocks)
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
    print(f"Versão {args.version}: {len(results)} estimativas, {len(shocks)} surpresas, PDF e manifesto exportados e validados.")


if __name__ == "__main__":
    main()
