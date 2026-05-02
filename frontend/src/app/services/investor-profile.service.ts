import { Injectable } from '@angular/core';
import { Component, computed, signal } from '@angular/core';

export interface QuestionOption {
  label: string;
  score: number;
}

export interface Question {
  id: number;
  text: string;
  options?: QuestionOption[];
}

@Injectable({
  providedIn: 'root'
})
export class InvestorProfileService {

  currentQuestion = signal<number>(0)
  lastQuestion = computed(() => this.questions.length - 1)
  answers = signal<(number | null)[]>(Array(9).fill(null));
  canGoNext = computed(() => this.answers()[this.currentQuestion()] !== null);

  selectAnswer(score: number): void {
    this.answers.update(prev => {
      const updated = [...prev];
      updated[this.currentQuestion()] = score;
      return updated;
    });
  }

  next() {
    if (!this.canGoNext()) return
    if(this.currentQuestion() >= this.lastQuestion()) return
    this.currentQuestion.update(q => q + 1)
    console.log(this.currentQuestion())
  }

  back() {
    if(this.currentQuestion() <= 0) return
    this.currentQuestion.update(q => q - 1)
    console.log(this.currentQuestion())
  }

  readonly questions: Question[] = [
    {
      id: 1,
      text: '¿Cuál es tu franja de edad?',
      options: [
        { label: '18 - 25 años',    score: 3 },
        { label: '26 - 35 años',    score: 2 },
        { label: '36 - 50 años',    score: 1 },
        { label: 'Más de 50 años',  score: 0 },
      ]
    },
    {
      id: 2,
      text: '¿Cuál es tu nivel de ingresos anuales?',
      options: [
        { label: 'Menos de 20.000 €',       score: 0 },
        { label: '20.000 - 50.000 €',       score: 1 },
        { label: '50.000 - 100.000 €',      score: 2 },
        { label: 'Más de 100.000 €',        score: 3 },
      ]
    },
    {
      id: 3,
      text: '¿Cuánta experiencia tienes invirtiendo?',
      options: [
        { label: 'Ninguna',           score: 0 },
        { label: 'Menos de 2 años',   score: 1 },
        { label: '2 - 5 años',        score: 2 },
        { label: 'Más de 5 años',     score: 3 },
      ]
    },
    {
      id: 4,
      text: 'Si tu cartera cae un 20% en 3 meses, ¿qué harías?',
      options: [
        { label: 'Vendería todo inmediatamente', score: 0 },
        { label: 'Reduciría posiciones',         score: 1 },
        { label: 'Mantendría la posición',       score: 2 },
        { label: 'Compraría más',                score: 3 },
      ]
    },
    {
      id: 5,
      text: '¿Cuál es tu objetivo principal al invertir?',
      options: [
        { label: 'Preservar capital',      score: 0 },
        { label: 'Generar ingresos',       score: 1 },
        { label: 'Crecimiento moderado',   score: 2 },
        { label: 'Máximo crecimiento',     score: 3 },
      ]
    },
    {
      id: 6,
      text: '¿En cuánto tiempo necesitas este dinero?',
      options: [
        { label: 'Menos de 1 año',  score: 0 },
        { label: '1 - 3 años',      score: 1 },
        { label: '3 - 10 años',     score: 2 },
        { label: 'Más de 10 años',  score: 3 },
      ]
    },
    {
      id: 7,
      text: '¿Qué porcentaje de tus ahorros invertirías?',
      options: [
        { label: 'Menos del 25%',  score: 0 },
        { label: '25% - 50%',      score: 1 },
        { label: '50% - 75%',      score: 2 },
        { label: 'Más del 75%',    score: 3 },
      ]
    },
    {
      id: 8,
      text: '¿Conoces estos instrumentos financieros?',
      options: [
        { label: 'Solo cuentas de ahorro',  score: 0 },
        { label: 'Acciones y ETFs',         score: 1 },
        { label: 'Opciones y futuros',      score: 2 },
        { label: 'Crypto y DeFi',           score: 3 },
      ]
    },
    {
      id: 9,
      text: '¿Cómo describirías tu estilo inversor?',
      options: [
        { label: 'Conservador', score: 0 },
        { label: 'Moderado',    score: 1 },
        { label: 'Dinámico',    score: 2 },
        { label: 'Agresivo',    score: 3 },
      ]
    },
  ];
}
