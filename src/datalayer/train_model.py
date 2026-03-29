import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

def train_and_export_brain():
    print("🧠 Lade Trainingsdaten aus Rust...")

    # 1. Daten laden (Wir nutzen den Output deiner Rust-Engine)
    # Passe den Pfad an, falls dein Python-Skript in einem anderen Ordner liegt
    df = pd.read_csv("../data/features_train.csv")

    # 2. Wir werfen die Namen und den Text-Belag weg, die KI braucht nur Zahlen
    # Wenn wir Beläge nutzen wollen, müssten wir sie "One-Hot-Encoden",
    # aber für diesen Testlauf nehmen wir nur die harten Differenzen.
    features = ['glicko_diff_overall', 'glicko_diff_surface', 'form_diff']

    X = df[features]
    y = df['target_p1_won']

    # 3. Wir splitten die Daten: 80% zum Lernen, 20% für den finalen, harten Test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Lerne aus {len(X_train)} Matches...")

    # 4. Das XGBoost Modell (Die Einstellungen eines Hedgefonds)
    model = xgb.XGBClassifier(
    n_estimators=300,        # 300 Entscheidungsbäume
    learning_rate=0.05,      # Langsam und präzise lernen
    max_depth=4,             # Nicht zu tief, um Overfitting zu vermeiden
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
    )

    # 5. Training!
    model.fit(X_train, y_train)

    # 6. Der Moment der Wahrheit: Wie gut ist das Modell?
    predictions = model.predict(X_test)
    acc = accuracy_score(y_test, predictions)

    print("\n==================================")
    print(f"🎯 TREFFERQUOTE (Accuracy): {acc * 100:.2f}%")
    print("==================================\n")

    # 7. Gehirn einfrieren und für Rust exportieren
    model.save_model("../data/xgboost_model.json")
    print("💾 Gehirn erfolgreich als 'xgboost_model.json' gespeichert!")

if __name__ == "__main__":
    train_and_export_brain()