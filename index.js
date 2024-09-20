import fs from 'fs';
import { parse } from 'csv-parse';
import axios from 'axios';
import chalk from 'chalk';

// Define o caminho correto para o arquivo CSV
const filePath = './input.csv';

// Variável para controlar o número máximo de erros consecutivos permitidos
const MAX_ERROS_CONSECUTIVOS = 5;
let contadorErrosConsecutivos = 0;

// Função para buscar o CEP
async function buscarCep(cep) {
    try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.data.erro) {
            console.log(chalk.red(`CEP: ${cep} não encontrado.`));
            return { cep, bairro: 'CEP não encontrado' };
        }
        contadorErrosConsecutivos = 0;  // Reseta o contador de erros quando a busca for bem-sucedida
        return { cep, bairro: response.data.bairro || 'Bairro não informado' };
    } catch (error) {
        console.log(chalk.red(`Erro ao buscar CEP ${cep}: ${error.message}`));
        contadorErrosConsecutivos++;
        if (contadorErrosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
            console.log(chalk.bgYellowBright.red.bold('Número máximo de erros consecutivos atingido. Encerrando o processo.'));
            process.exit(1);  // Encerra o processo
        }
        return { cep, bairro: 'Erro na busca' };
    }
}

// Função para processar o arquivo CSV
function processarCSV() {
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
            }
            console.log(chalk.blue('Processamento concluído.'));
        })
        .on('error', (error) => {
            console.log(chalk.red(`Erro ao ler o arquivo CSV: ${error.message}`));
        });
}

// Iniciar o processamento do CSV
processarCSV();
