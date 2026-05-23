import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; 

export interface QuestionOption {
  label: string;
  score: number;
}

export interface Question {
  id: number;
  text: string;
  options?: QuestionOption[];
}

export interface ProfileResult {
  profile: 'conservador' | 'moderado' | 'agresivo';
  label: string;
  score: number;
  max_score: number;
  ml_confidence: number | null;
  description: string;
  answers: number[];
  completed_at: string;
}

export type ViewState = 'questionnaire' | 'loading' | 'result' | 'error';

@Injectable({
  providedIn: 'root'
})
export class InvestorProfileService {

  private http = inject(HttpClient);

  currentQuestion = signal<number>(0);
  lastQuestion    = computed(() => this.questions.length - 1);
  answers         = signal<(number | null)[]>(Array(9).fill(null));
  canGoNext       = computed(() => this.answers()[this.currentQuestion()] !== null);

  viewState     = signal<ViewState>('loading');
  profileResult = signal<ProfileResult | null>(null);
  errorMessage  = signal<string | null>(null);

  constructor() {
    this.loadExistingProfile();
  }

  loadExistingProfile(): void {
    this.viewState.set('loading');

    this.http.get<ProfileResult>(`${environment.apiUrl}/investor-profile`).subscribe({
      next: (result) => {
        this.profileResult.set(result);
        this.viewState.set('result');
      },
      error: (err) => {
        if (err.status === 404) {
          this.viewState.set('questionnaire');
        } else {
          this.viewState.set('questionnaire');
        }
      }
    });
  }

  selectAnswer(score: number): void {
    this.answers.update(prev => {
      const updated = [...prev];
      updated[this.currentQuestion()] = score;
      return updated;
    });
  }

  next(): void {
    if (!this.canGoNext()) return;

    if (this.currentQuestion() >= this.lastQuestion()) {
      this.submitProfile();
      return;
    }

    this.currentQuestion.update(q => q + 1);
  }

  back(): void {
    if (this.currentQuestion() <= 0) return;
    this.currentQuestion.update(q => q - 1);
  }

  reset(): void {
    this.currentQuestion.set(0);
    this.answers.set(Array(9).fill(null));
    this.profileResult.set(null);
    this.errorMessage.set(null);
    this.viewState.set('questionnaire');
  }

  submitProfile(): void {
    const rawAnswers = this.answers();
    if (rawAnswers.some(a => a === null)) return;

    this.viewState.set('loading');

    this.http.post<ProfileResult>(
      `${environment.apiUrl}/investor-profile`,
      { answers: rawAnswers }
    ).subscribe({
      next: (result) => {
        this.profileResult.set(result);
        this.viewState.set('result');
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message ?? 'Error al procesar tu perfil. Inténtalo de nuevo.'
        );
        this.viewState.set('error');
      }
    });
  }

  readonly allQuestions: Question[] = [
    {
      id: 1,
      text: '¿Cuál es tu franja de edad?',
      options: [
        { label: '18 - 25 años',   score: 3 },
        { label: '26 - 35 años',   score: 2 },
        { label: '36 - 50 años',   score: 1 },
        { label: 'Más de 50 años', score: 0 },
      ]
    },
    {
      id: 2,
      text: '¿Cuál es tu nivel de ingresos anuales?',
      options: [
        { label: 'Menos de 20.000 €',  score: 0 },
        { label: '20.000 - 50.000 €',  score: 1 },
        { label: '50.000 - 100.000 €', score: 2 },
        { label: 'Más de 100.000 €',   score: 3 },
      ]
    },
    {
      id: 3,
      text: '¿Cuánta experiencia tienes invirtiendo?',
      options: [
        { label: 'Ninguna',         score: 0 },
        { label: 'Menos de 2 años', score: 1 },
        { label: '2 - 5 años',      score: 2 },
        { label: 'Más de 5 años',   score: 3 },
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
        { label: 'Preservar capital',    score: 0 },
        { label: 'Generar ingresos',     score: 1 },
        { label: 'Crecimiento moderado', score: 2 },
        { label: 'Máximo crecimiento',   score: 3 },
      ]
    },
    {
      id: 6,
      text: '¿En cuánto tiempo necesitas este dinero?',
      options: [
        { label: 'Menos de 1 año', score: 0 },
        { label: '1 - 3 años',     score: 1 },
        { label: '3 - 10 años',    score: 2 },
        { label: 'Más de 10 años', score: 3 },
      ]
    },
    {
      id: 7,
      text: '¿Qué porcentaje de tus ahorros invertirías?',
      options: [
        { label: 'Menos del 25%', score: 0 },
        { label: '25% - 50%',     score: 1 },
        { label: '50% - 75%',     score: 2 },
        { label: 'Más del 75%',   score: 3 },
      ]
    },
    {
      id: 8,
      text: '¿Conoces estos instrumentos financieros?',
      options: [
        { label: 'Solo cuentas de ahorro', score: 0 },
        { label: 'Acciones y ETFs',        score: 1 },
        { label: 'Opciones y futuros',     score: 2 },
        { label: 'Crypto y DeFi',          score: 3 },
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

  readonly questions: Question[] = this.shuffle([...this.allQuestions]);

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}