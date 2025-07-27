import * as vscode from 'vscode';
import { startServer } from './server';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "remote-server" is now active!');

    const server = startServer();

    context.subscriptions.push(new vscode.Disposable(() => {
        server.close();
    }));
}

export function deactivate() {}