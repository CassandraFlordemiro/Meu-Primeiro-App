import fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify'; // Importa o csv-stringify
import axios from 'axios';
import chalk from 'chalk';

// Define o caminho correto para o arquivo CSV
const filePath = './input.csv';
const outputPath = './output.csv'; // Caminho do arquivo de saída

// Variável para controlar o número máximo de erros consecutivos permitidos
const MAX_ERROS_CONSECUTIVOS = 5;
let contadorErrosConsecutivos = 0;

// Variável para armazenar a API escolhida
let apiEscolhida = null;

// Função para verificar se a API está online
async function isApiOnline(url) {
    try {
        const response = await axios.get(url);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Função para selecionar qual API será utilizada
async function selecionarApi() {
    // Testa ViaCep primeiro
    const viaCepOnline = await isApiOnline('https://viacep.com.br/ws/01001000/json/');
    if (viaCepOnline) {
        apiEscolhida = 'ViaCep';
        console.log(chalk.blue('API selecionada: ViaCep'));
        return;
    }

    // Se ViaCep estiver offline, testa BrasilAPI
    const brasilApiOnline = await isApiOnline('https://brasilapi.com.br/api/cep/v2/01001000');
    if (brasilApiOnline) {
        apiEscolhida = 'BrasilAPI';
        console.log(chalk.blue('API selecionada: BrasilAPI'));
        return;
    }

    // Se ambas APIs estiverem offline, encerra o processo
    console.log(chalk.bgYellowBright.red.bold('Nenhuma API está disponível no momento. Encerrando o processo.'));
    process.exit(1); // Encerra o processo se ambas as APIs estiverem offline
}

// Função para buscar o CEP utilizando a API selecionada
async function buscarCep(cep) {
    let url;

    if (apiEscolhida === 'ViaCep') {
        url = `https://viacep.com.br/ws/${cep}/json/`;
    } else if (apiEscolhida === 'BrasilAPI') {
        url = `https://brasilapi.com.br/api/cep/v2/${cep}`;
    }

    try {
        const response = await axios.get(url);
        if (apiEscolhida === 'ViaCep' && response.data.erro) {
            console.log(chalk.red(`CEP: ${cep} não encontrado no ViaCep.`));
            return { cep, bairro: 'CEP não encontrado' };
        }
        contadorErrosConsecutivos = 0; // Reseta o contador de erros quando a busca for bem-sucedida
        return { cep, bairro: response.data.neighborhood || 'Bairro não informado' };
    } catch (error) {
        console.log(chalk.red(`Erro ao buscar CEP ${cep} na API ${apiEscolhida}: ${error.message}`));
        contadorErrosConsecutivos++;
        if (contadorErrosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
            console.log(chalk.bgYellowBright.red.bold('Número máximo de erros consecutivos atingido. Encerrando o processo.'));
            process.exit(1); // Encerra o processo
        }
        return { cep, bairro: 'Erro na busca' };
    }
}

// Array para armazenar os resultados
const resultados = [];

// Função para processar o arquivo CSV
async function processarCSV() {
    // Seleciona a API a ser usada no início do processo
    await selecionarApi();

    const results = [];
    fs.createReadStream(filePath)
        .pipe(parse({ columns: true }))
        .on('data', (row) => {
            results.push(row);
        })
        .on('end', async () => {
            console.log(chalk.yellow(`Total de CEPs a serem analisados: ${results.length}`)); // Exibe o número de CEPs no início

            for (const row of results) {
                const { CEP } = row;
                const resultado = await buscarCep(CEP);
                console.log(chalk.green(`CEP: ${resultado.cep}, Bairro: ${resultado.bairro}`));
                resultados.push(resultado); // Adiciona o resultado ao array
            }
            console.log(chalk.blue('Processamento concluído.'));
            
            // Gera o arquivo CSV com os resultados
            gerarCSV();
        })
        .on('error', (error) => {
            console.log(chalk.red(`Erro ao ler o arquivo CSV: ${error.message}`));
        });
}

// Função para gerar o arquivo CSV com os resultados
function gerarCSV() {
    stringify(resultados, { header: true })
        .pipe(fs.createWriteStream(outputPath))
        .on('finish', () => {
            console.log(chalk.green(`Arquivo de saída gerado: ${outputPath}`));
        })
        .on('error', (error) => {
            console.log(chalk.red(`Erro ao gerar o arquivo CSV: ${error.message}`));
        });
}

// Iniciar o processamento do CSV
processarCSV();
