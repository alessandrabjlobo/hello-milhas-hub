import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseWithAI } from '../lib/ai-bilhete-parser';

describe('AI Bilhete Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar objeto vazio quando não há API key', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    const result = await parseWithAI('teste');
    expect(result).toEqual({});
  });

  it('deve retornar objeto vazio quando o texto está vazio', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key');
    const result = await parseWithAI('');
    expect(result).toEqual({});
  });

  it('deve extrair campos de um bilhete válido', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key');

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              pnr: 'ABC123',
              ticketNumber: '957-1234567890',
              passengerName: 'SILVA/JOAO',
              cpf: '12345678901',
              route: 'GRU-MCO',
              departureDate: '2024-06-15',
              airline: 'LATAM',
              flightNumber: 'LA8084'
            })
          }
        }
      ]
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const bilheteText = `
      BILHETE ELETRÔNICO / ELECTRONIC TICKET
      PNR: ABC123
      Número do Bilhete: 957-1234567890
      Passageiro: SILVA/JOAO
      CPF: 123.456.789-01
      Voo: LA8084
      Rota: GRU-MCO
      Data: 15/06/2024
      Companhia: LATAM
    `;

    const result = await parseWithAI(bilheteText);

    expect(result).toEqual({
      pnr: 'ABC123',
      ticketNumber: '957-1234567890',
      passengerName: 'SILVA/JOAO',
      cpf: '12345678901',
      route: 'GRU-MCO',
      departureDate: '2024-06-15',
      airline: 'LATAM',
      flightNumber: 'LA8084'
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('deve lidar com erro 401 da API', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'invalid-key');

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      } as Response)
    );

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await parseWithAI('teste de bilhete');

    expect(result).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erro na chamada OpenAI:',
      401,
      'Unauthorized',
      'Invalid API key'
    );

    consoleErrorSpy.mockRestore();
  });

  it('deve lidar com resposta JSON inválida', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key');

    const mockResponse = {
      choices: [
        {
          message: {
            content: 'não é um JSON válido'
          }
        }
      ]
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await parseWithAI('teste de bilhete');

    expect(result).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Falha ao fazer JSON.parse no retorno da OpenAI. Conteúdo bruto:',
      'não é um JSON válido'
    );

    consoleErrorSpy.mockRestore();
  });
});
