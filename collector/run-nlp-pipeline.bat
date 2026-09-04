@echo off
REM Pipeline NLP + Embeddings
REM Lance l'analyse NLP et la génération d'embeddings

echo.
echo ╔════════════════════════════════════════╗
echo ║   🧠 PIPELINE NLP + EMBEDDINGS        ║
echo ╚════════════════════════════════════════╝
echo.

REM Étape 1: NLP Processing
echo 📊 ÉTAPE 1/2 : Analyse NLP...
echo.
python nlp-processor.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erreur lors de l'analyse NLP
    pause
    exit /b 1
)

echo.
echo ✅ Analyse NLP terminée
echo.

REM Étape 2: Embedding Generation
echo 📊 ÉTAPE 2/2 : Génération des embeddings...
echo.
python embedding-generator.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erreur lors de la génération d'embeddings
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════╗
echo ║   ✅ PIPELINE NLP TERMINÉ             ║
echo ╚════════════════════════════════════════╝
echo.
echo 🎉 Tous les traitements sont terminés !
echo.
pause
