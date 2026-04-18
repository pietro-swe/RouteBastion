# RouteBastion Broker

# Índice

- [Visão Geral](#visão-geral)
- [Introdução](#introdução)
- [Requisitos Funcionais e Não Funcionais](#requisitos-funcionais-e-não-funcionais)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Primeiros Passos](#primeiros-passos)

# Visão Geral

Este repositório contém o código do RouteBastion Broker, um middleware unificado de APIs projetado para integrar múltiplos serviços de roteirização na solução do Problema de Roteamento de Veículos. O RouteBastion Broker atua como um intermediário entre os clientes e os diversos serviços de roteirização, oferecendo uma interface consistente e simplificada para acessar diferentes algoritmos e soluções de roteamento.

# Introdução

A otimização de rotas é um componente central da logística moderna e dos sistemas inteligentes de transporte. O avanço do comércio eletrônico, das entregas sob demanda e dos serviços de mobilidade ampliou a dependência de soluções capazes de resolver Problemas de Roteamento de Veículos (VRP), reduzindo custos, melhorando prazos e aumentando a eficiência operacional. Esses serviços encapsulam algoritmos complexos de otimização, permitindo que organizações foquem na lógica de negócio. Entretanto, grandes provedores, como Google e Microsoft, adotam formatos de dados, limites operacionais e modelos de precificação distintos. Essa heterogeneidade favorece o vendor lock-in e dificulta a construção de soluções capazes de alternar ou combinar provedores de forma flexível.

O RouteBastion foi projetado como uma camada intermediária que unifica múltiplas APIs de VRP por meio de uma interface única, consistente e escalável. Trabalhos anteriores descreveram sua base arquitetural, destacando modularidade, extensibilidade e independência de provedor. Após a construção de uma versão preliminar, melhorias foram implementadas e a integração com o primeiro provedor de API de VRP foi realizada, a Google Routes API.

# Requisitos Funcionais e Não Funcionais

## Requisitos Funcionais
| ID   | Requirement                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR01 | As an External Software System (ESS), I want to register and manipulate (query, update, delete) all my limitations, such as the available budget and security/performance/availability concerns, in order to tailor my needs for selecting a Cloud Provider. |
| FR02 | As an ESS, I want to request an optimization by sending waypoints and vehicles involved on the route, to start a new optimization.                                                                                                                           |
| FR03 | As an ESS, I want to cancel an optimization by sending an optimization identifier, in order to cancel a running optimization.                                                                                                                                |
| FR04 | As an ESS, I want to query my running optimizations and their progresses, in order to get to know the progress of my optimizations.                                                                                                                          |
| FR05 | As an ESS, I want to query my previous completed optimizations, in order to access historical data.                                                                                                                                                          |
| FR06 | As an ESS, I want to be able to opt-out the Selection Algorithm by choosing a pre-defined VRP API based on the available ones, in order to use an API that suits my needs.                                                                                   |
| FR07 | As the Broker API, I should periodically request the status of an optimization and memoize the result in order to reduce the system's overall latency.                                                                                                       |
| FR08 | As the Broker API, I should balance the workload between cloud providers, in order to not be blocked from making new requests to a specific cloud provider.                                                                                                  |
| FR09 | As the Broker API, I should expose a list of available Cloud Providers, in order to be transparent with ESSs.                                                                                                                                                |
| FR10 | As the Broker API, I should periodically run the Selection Algorithm and memorize the results, in order to know the best available VRP APIs providers to reduce the latency of requests.                                                                     |
| FR11 | As the Broker API, I should queue pending optimization requests if the selected cloud provider is busy (i.e. the maximum of requests have been achieved).                                                                                                    |

## Requisitos Não Funcionais

| ID    | Requirement                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| NFR01 | The system should ensure data integrity and source integrity (i.e., non-repudiation) to provide accountability.                          |
| NFR02 | The system should ensure confidentiality.                                                                                                |
| NFR03 | The system should ensure high availability through measures that minimize downtime for operations such as deployment and error recovery. |
| NFR04 | The system should have low latency to handle a high number of requests.                                                                  |
| NFR05 | The system should be easy to maintain and extend.                                                                                        |
| NFR06 | The system should be scalable to handle a high number of requests while maintaining high throughput and low latency.                     |
| NFR07 | The system should be elastic, reducing resource consumption while handling low throughput of requests.                                   |
| NFR08 | The system should be fault-tolerant by using multiple replicas to ensure reliability for ESSs.                                           |
| NFR09 | The system should be interoperable to cope with different clients and VRP API providers.                                                 |

# Arquitetura

Este repositório contém o código do RouteBastion Broker.
