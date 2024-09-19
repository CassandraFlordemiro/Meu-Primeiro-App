import fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import fetch from 'node-fetch';
import chalk from 'chalk';  // Usa import para o chalk

// Função para adicionar um delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para buscar bairro por CEP
const buscarBairro = async (cep) => {
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Resposta da API não OK');
        }
        const data = await response.json();
        return data.bairro || 'Não encontrado';
    } catch (error) {
        console.error(chalk.red(`Erro ao buscar CEP ${cep}: ${error}`));  // Usa o chalk para colorir o erro
        return 'Erro na busca';
    }
};

// Função para processar o arquivo CSV
const processarArquivo = async (inputFilePath, outputFilePath) => {
    const ceps = [];
    const resultados = [];

    // Leitura e processamento do CSV
    fs.createReadStream(inputFilePath)
        .pipe(parse({ columns: true, skip_empty_lines: true }))
        .on('data', async (row) => {
            if (row.CEP) {
                ceps.push(row.CEP);
            }
        })
        .on('end', async () => {
            console.log(`Total de CEPs para buscar: ${ceps.length}`);

            // Processa os CEPs em lotes
            for (let i = 0; i < ceps.length; i += 500) { // Processa em lotes de 500
                const lote = ceps.slice(i, i + 500);
                for (const cep of lote) {
                    const bairro = await buscarBairro(cep);
                    resultados.push({ CEP: cep, Bairro: bairro });
                    if (bairro === 'Não encontrado' || bairro === 'Erro na busca') {
                        console.log(chalk.red(`CEP: ${cep}, Bairro: ${bairro}`));  // Exibe em vermelho se não encontrado
                    } else {
                        console.log(`CEP: ${cep}, Bairro: ${bairro}`);
                    }
                    
                    // Adiciona um delay de 1000ms (1 segundo) entre as requisições
                    await delay(1000);
                }
            }

            // Gera o arquivo CSV de saída
            stringify(resultados, { header: true, columns: ['CEP', 'Bairro'] }, (err, output) => {
                if (err) {
                    console.error(`Erro ao gerar CSV: ${err}`);
                    return;
                }
                fs.writeFileSync(outputFilePath, output);
                console.log(`Arquivo CSV gerado com sucesso: ${outputFilePath}`);
            });
        });
};

// Substitua pelos caminhos reais dos arquivos
const inputFilePath = 'input.csv';
const outputFilePath = 'output.csv';

// Inicia o processamento
processarArquivo(inputFilePath, outputFilePath);
