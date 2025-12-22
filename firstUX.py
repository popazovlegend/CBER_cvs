import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import requests
import base64
import io
import threading
from datetime import datetime
from PIL import Image, ImageTk

class DigitalNotesApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Цифровые конспекты")
        self.root.geometry("900x750")

        # Данные (State)
        self.notes = [
            {
                'id': 1,
                'title': 'Квадратные уравнения',
                'subject': 'Математика',
                'group': '9А класс',
                'author': 'Иван П.',
                'date': '2024-12-15',
                'rating': 4.5,
                'views': 45,
                'processed': True,
                'content': 'Квадратное уравнение имеет вид ax² + bx + c = 0. Для решения используется дискриминант D = b² - 4ac...'
            },
            {
                'id': 2,
                'title': 'Фотосинтез',
                'subject': 'Биология',
                'group': '10Б класс',
                'author': 'Мария К.',
                'date': '2024-12-18',
                'rating': 5.0,
                'views': 78,
                'processed': True,
                'content': 'Фотосинтез - процесс образования органических веществ из CO₂ и H₂O на свету в хлоропластах...'
            },
            {
                'id': 3,
                'title': 'Великая французская революция',
                'subject': 'История',
                'group': '8В класс',
                'author': 'Алексей Н.',
                'date': '2024-12-20',
                'rating': 4.2,
                'views': 32,
                'processed': True,
                'content': 'Революция началась в 1789 году. Основные причины: экономический кризис, неравенство сословий...'
            }
        ]
        self.subjects = ['Все', 'Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Английский язык']
        self.current_image_base64 = None
        
        # Стили
        style = ttk.Style()
        style.configure("TLabel", font=("Arial", 10))
        style.configure("TButton", font=("Arial", 10))
        style.configure("Header.TLabel", font=("Arial", 16, "bold"))
        
        # Основной контейнер
        main_frame = ttk.Frame(root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Заголовок
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(header_frame, text="📚 Цифровые конспекты", style="Header.TLabel").pack(side=tk.LEFT)
        self.stats_label = ttk.Label(header_frame, text=f"Всего конспектов: {len(self.notes)} | Статус: Открытая база")
        self.stats_label.pack(side=tk.RIGHT)
        
        # Вкладки
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        self.tab_browse = ttk.Frame(self.notebook)
        self.tab_upload = ttk.Frame(self.notebook)
        
        self.notebook.add(self.tab_browse, text="🔍 Найти конспект")
        self.notebook.add(self.tab_upload, text="📤 Загрузить конспект")
        
        self.setup_browse_tab()
        self.setup_upload_tab()
        
    def setup_browse_tab(self):
        # Фильтры
        filter_frame = ttk.Frame(self.tab_browse, padding="5")
        filter_frame.pack(fill=tk.X)
        
        ttk.Label(filter_frame, text="Поиск:").pack(side=tk.LEFT, padx=5)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.refresh_notes_list)
        ttk.Entry(filter_frame, textvariable=self.search_var, width=30).pack(side=tk.LEFT, padx=5)
        
        ttk.Label(filter_frame, text="Предмет:").pack(side=tk.LEFT, padx=5)
        self.subject_filter_var = tk.StringVar(value="Все")
        subj_cb = ttk.Combobox(filter_frame, textvariable=self.subject_filter_var, values=self.subjects, state="readonly")
        subj_cb.pack(side=tk.LEFT, padx=5)
        subj_cb.bind("<<ComboboxSelected>>", self.refresh_notes_list)
        
        # Прокручиваемый список
        self.canvas = tk.Canvas(self.tab_browse)
        scrollbar = ttk.Scrollbar(self.tab_browse, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=scrollbar.set)
        
        self.canvas.pack(side="left", fill="both", expand=True, pady=10)
        scrollbar.pack(side="right", fill="y", pady=10)
        
        # Прокрутка колесиком мыши
        self.canvas.bind_all("<MouseWheel>", lambda e: self.canvas.yview_scroll(int(-1*(e.delta/120)), "units"))

        self.refresh_notes_list()

    def refresh_notes_list(self, *args):
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
            
        query = self.search_var.get().lower()
        subject = self.subject_filter_var.get()
        
        filtered = [
            n for n in self.notes
            if (subject == 'Все' or n['subject'] == subject) and
            (query in n['title'].lower() or query in n['content'].lower())
        ]
        
        if not filtered:
            ttk.Label(self.scrollable_frame, text="Конспекты не найдены").pack(pady=20)
            return
            
        for note in filtered:
            frame = ttk.LabelFrame(self.scrollable_frame, text=f"{note['title']} ({note['subject']})", padding="10")
            frame.pack(fill=tk.X, padx=5, pady=5, expand=True)
            
            info_text = f"Автор: {note['author']} | Группа: {note['group']} | Дата: {note['date']}"
            ttk.Label(frame, text=info_text, foreground="gray").pack(anchor="w")
            
            content_preview = note['content'][:200] + "..." if len(note['content']) > 200 else note['content']
            lbl = ttk.Label(frame, text=content_preview, wraplength=800)
            lbl.pack(anchor="w", pady=5)
            
            stats = f"Рейтинг: {note['rating']} ⭐ | Просмотры: {note['views']} 👁️"
            ttk.Label(frame, text=stats, font=("Arial", 8)).pack(anchor="e")

    def setup_upload_tab(self):
        container = ttk.Frame(self.tab_upload, padding="20")
        container.pack(fill=tk.BOTH, expand=True)
        
        # Форма
        form_frame = ttk.Frame(container)
        form_frame.pack(fill=tk.X)
        
        # Поля ввода
        ttk.Label(form_frame, text="Название:").grid(row=0, column=0, sticky="w", pady=5)
        self.new_title = ttk.Entry(form_frame, width=40)
        self.new_title.grid(row=0, column=1, sticky="w", pady=5)
        
        ttk.Label(form_frame, text="Предмет:").grid(row=1, column=0, sticky="w", pady=5)
        self.new_subject = ttk.Combobox(form_frame, values=self.subjects[1:], state="readonly", width=37)
        self.new_subject.current(0)
        self.new_subject.grid(row=1, column=1, sticky="w", pady=5)
        
        ttk.Label(form_frame, text="Класс/Группа:").grid(row=2, column=0, sticky="w", pady=5)
        self.new_group = ttk.Entry(form_frame, width=40)
        self.new_group.grid(row=2, column=1, sticky="w", pady=5)
        
        ttk.Label(form_frame, text="Автор:").grid(row=3, column=0, sticky="w", pady=5)
        self.new_author = ttk.Entry(form_frame, width=40)
        self.new_author.grid(row=3, column=1, sticky="w", pady=5)
        
        ttk.Label(form_frame, text="API Key (Anthropic):").grid(row=4, column=0, sticky="w", pady=5)
        self.api_key = ttk.Entry(form_frame, width=40, show="*")
        self.api_key.grid(row=4, column=1, sticky="w", pady=5)
        
        # Загрузка фото
        btn_frame = ttk.Frame(container)
        btn_frame.pack(fill=tk.X, pady=10)
        ttk.Button(btn_frame, text="Выбрать фото", command=self.choose_image).pack(side=tk.LEFT)
        self.img_label_status = ttk.Label(btn_frame, text="Файл не выбран")
        self.img_label_status.pack(side=tk.LEFT, padx=10)
        
        # Превью
        self.preview_label = ttk.Label(container)
        self.preview_label.pack(pady=5)
        
        # Кнопка распознавания
        self.rec_btn = ttk.Button(container, text="🧠 Распознать текст", command=self.start_recognition, state="disabled")
        self.rec_btn.pack(pady=5)
        
        # Результат
        ttk.Label(container, text="Результат:").pack(anchor="w")
        self.result_text = scrolledtext.ScrolledText(container, height=10)
        self.result_text.pack(fill=tk.BOTH, expand=True)
        
        # Кнопка сохранения
        ttk.Button(container, text="Сохранить конспект", command=self.save_note).pack(pady=10)

    def choose_image(self):
        path = filedialog.askopenfilename(filetypes=[("Images", "*.jpg *.jpeg *.png")])
        if path:
            self.img_label_status.config(text=path)
            
            # Загрузка и ресайз для превью
            img = Image.open(path)
            img.thumbnail((300, 300))
            self.photo = ImageTk.PhotoImage(img)
            self.preview_label.config(image=self.photo)
            
            # Кодирование для API
            with open(path, "rb") as image_file:
                self.current_image_base64 = base64.b64encode(image_file.read()).decode('utf-8')
            
            self.rec_btn.config(state="normal")

    def start_recognition(self):
        key = self.api_key.get()
        if not key:
            messagebox.showerror("Ошибка", "Введите API Key")
            return
            
        self.rec_btn.config(state="disabled", text="Распознавание...")
        threading.Thread(target=self.run_api_call, args=(key,), daemon=True).start()

    def run_api_call(self, api_key):
        try:
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            }
            
            payload = {
                'model': 'claude-sonnet-4-20250514',
                'max_tokens': 1000,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'image',
                                'source': {
                                    'type': 'base64',
                                    'media_type': 'image/jpeg',
                                    'data': self.current_image_base64
                                }
                            },
                            {
                                'type': 'text',
                                'text': 'Пожалуйста, распознай и перепиши весь текст из этого рукописного конспекта. Сохрани структуру и форматирование.'
                            }
                        ]
                    }
                ]
            }
            
            response = requests.post('https://api.anthropic.com/v1/messages', headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                text_content = ""
                for item in data['content']:
                    if item['type'] == 'text':
                        text_content += item['text']
                
                self.root.after(0, self.update_result, text_content)
            else:
                self.root.after(0, self.show_error, f"Ошибка API: {response.status_code}")
                
        except Exception as e:
            self.root.after(0, self.show_error, str(e))

    def update_result(self, text):
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(tk.END, text)
        self.rec_btn.config(state="normal", text="🧠 Распознать текст")

    def show_error(self, msg):
        messagebox.showerror("Ошибка", msg)
        self.rec_btn.config(state="normal", text="🧠 Распознать текст")

    def save_note(self):
        title = self.new_title.get()
        group = self.new_group.get()
        author = self.new_author.get()
        content = self.result_text.get(1.0, tk.END).strip()
        
        if not title or not group or not author:
            messagebox.showwarning("Внимание", "Заполните все поля (Название, Группа, Автор)")
            return
            
        if not content:
            messagebox.showwarning("Внимание", "Нет текста конспекта")
            return
            
        new_note = {
            'id': len(self.notes) + 1,
            'title': title,
            'subject': self.new_subject.get(),
            'group': group,
            'author': author,
            'date': datetime.now().strftime('%Y-%m-%d'),
            'rating': 0,
            'views': 0,
            'processed': True,
            'content': content
        }
        
        self.notes.insert(0, new_note)
        self.stats_label.config(text=f"Всего конспектов: {len(self.notes)} | Статус: Открытая база")
        
        # Очистка формы
        self.new_title.delete(0, tk.END)
        self.new_group.delete(0, tk.END)
        self.new_author.delete(0, tk.END)
        self.result_text.delete(1.0, tk.END)
        self.preview_label.config(image='')
        self.img_label_status.config(text="Файл не выбран")
        self.current_image_base64 = None
        
        messagebox.showinfo("Успех", "Конспект сохранен!")
        self.notebook.select(self.tab_browse)
        self.refresh_notes_list()

if __name__ == "__main__":
    root = tk.Tk()
    app = DigitalNotesApp(root)
    root.mainloop()
